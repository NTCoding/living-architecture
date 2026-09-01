import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import {
  type DraftConfiguration,
  type DraftModule,
  parseExtractionConfig,
  parseWorkflowDefinition,
  type ValidatedModuleInput,
  type ValidatedModule,
  ValidatedConfiguration,
  type ValidationError,
  type WorkflowDefinition,
} from '@living-architecture/riviere-extract-config-published-language'
import {
  FileReadError,
  readJsonFile,
  readTextFile,
} from '../../../../infra/external-clients/filesystem/file-reader'
import { fileExists } from '../../../../infra/external-clients/filesystem/file-existence'
import { resolveFileOrPackagePath } from '../../../../infra/external-clients/node-modules/node-module-file-resolver'
import { GitError } from '../../../../infra/external-clients/git/git-errors'
import { getRepositoryInfo } from '../../../../infra/external-clients/git/git-repository-info'
import { RiviereProject } from '@living-architecture/riviere-extract-ts-domain-model/domain/riviere-project'
import { ExtractionConfiguration } from '@living-architecture/riviere-extract-ts-domain-model/domain/extraction-configuration'
import { createTypeScriptProjects } from '../../../../infra/external-clients/ts-morph/create-typescript-projects'
import { ExtractionConfigError } from './riviere-config-error'
import { ExtractionDataAccessError } from './riviere-project-error'
import { DraftComponent } from '@living-architecture/riviere-extract-ts-domain-model/domain/component-extraction/draft-component'
import { WorkflowStage } from '@living-architecture/riviere-extract-ts-domain-model/domain/workflow-stage'
import { DraftComponentsLoadError } from './draft-components-load-error'
import { parseRiviereGraph } from '@living-architecture/riviere-schema-published-language/validation'
import { globSourceFiles } from '../../../../infra/external-clients/glob/glob-source-files'
import {
  YamlDocumentError,
  YamlDocumentReader,
} from '../../../../infra/external-clients/yaml/yaml-document-reader'
import { GraphCorruptedError } from './graph-corrupted-error'
import { GraphNotFoundError } from './graph-not-found-error'

class ExtractionConfigLoadError extends Error {}
type ParsedConfigState = Readonly<{ configDir: string; configuration: ValidatedConfiguration }>
type ResolvedModuleDefaults = Pick<
  ValidatedModuleInput,
  'api' | 'useCase' | 'domainOp' | 'event' | 'eventHandler' | 'ui' | 'customTypes'
>

const NOT_USED = { notUsed: true } as const
type LoadParameters = Readonly<{
  projectRoot: string
  configPath: string
  useTsConfig: boolean
}>
type WorkflowLoadParameters = Readonly<{ projectRoot: string; workflowName: string }>

function formatExtractionConfigErrors(errors: readonly ValidationError[]): string {
  if (errors.length === 0) return 'validation failed without specific errors'
  return errors.map((error) => `${error.path}: ${error.message}`).join('\n')
}

/** @riviere-role aggregate-repository */
export class RiviereProjectRepository {
  loadByExtractionConfigPath(params: LoadParameters): RiviereProject {
    return this.loadProject(params, () => [])
  }

  save(graphFileLocation: string, project: RiviereProject): void {
    mkdirSync(dirname(graphFileLocation), { recursive: true })
    writeFileSync(graphFileLocation, project.serialize(), 'utf-8')
  }

  loadByDraftComponentsPath(
    params: LoadParameters & { readonly draftComponentsPath: string },
  ): RiviereProject {
    return this.loadProject(params, () => this.loadDraftComponents(params.draftComponentsPath))
  }

  loadByWorkflowName(params: WorkflowLoadParameters): RiviereProject {
    return this.translateDataAccessErrors(() => {
      const definition = this.loadWorkflowDefinition(params)
      const stages = definition.stages.map((stage) => {
        if (stage.kind === 'validate') return WorkflowStage.fromValidation(stage.name)
        const configuration = this.loadExtractionConfiguration({
          projectRoot: params.projectRoot,
          configPath: stage.configPath,
          useTsConfig: stage.useTsConfig,
        })
        return stage.kind === 'extract'
          ? WorkflowStage.fromExtraction(stage.name, configuration)
          : WorkflowStage.fromLink(stage.name, configuration)
      })
      const graphPath = resolve(params.projectRoot, definition.graph.outputPath)
      const project = this.loadWorkflowGraph(graphPath, {
        ...(definition.graph.name === undefined ? {} : { name: definition.graph.name }),
        ...(definition.graph.description === undefined
          ? {}
          : { description: definition.graph.description }),
        sources: definition.graph.sources,
        domains: definition.graph.domains,
      })
      const workflow = project.addWorkflow({
        name: params.workflowName,
        outputPath: graphPath,
        runLogDirectory: resolve(params.projectRoot, definition.runLog.directory),
        stages,
      })
      if (!workflow.success)
        throw new ExtractionConfigError('VALIDATION_ERROR', workflow.error.message)
      return project
    })
  }

  private loadProject(
    params: LoadParameters,
    loadDraftComponents: () => readonly DraftComponent[],
  ): RiviereProject {
    return this.translateDataAccessErrors(() => {
      const configuration = this.loadExtractionConfiguration(params)
      const projectResult = RiviereProject.start({
        configuration,
        draftComponents: loadDraftComponents(),
      })
      if (!projectResult.success)
        throw new ExtractionConfigError('VALIDATION_ERROR', projectResult.error)
      return projectResult.data
    })
  }

  private loadExtractionConfiguration(params: LoadParameters): ExtractionConfiguration {
    const configPath = resolve(params.projectRoot, params.configPath)
    const parsedConfigState = this.loadParsedConfigState(configPath)
    const sourceFilesByModule = this.resolveSourceFilePaths(parsedConfigState)
    const moduleSources = createTypeScriptProjects(
      parsedConfigState.configDir,
      sourceFilesByModule,
      params.useTsConfig,
    )
    return ExtractionConfiguration.parse({
      name: configPath,
      configPath,
      useTsConfig: params.useTsConfig,
      repositoryName: getRepositoryInfo('git', params.projectRoot).name,
      resolvedConfig: parsedConfigState.configuration,
      moduleContexts: [...moduleSources.entries()].map(([module, source]) => ({
        module,
        files: source.files,
        project: source.project,
      })),
    })
  }

  private loadWorkflowDefinition(params: WorkflowLoadParameters): WorkflowDefinition {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(params.workflowName)) {
      throw new ExtractionConfigError('VALIDATION_ERROR', 'Invalid workflow name')
    }
    const path = resolve(params.projectRoot, '.riviere', 'workflows', `${params.workflowName}.yaml`)
    if (!fileExists(path)) {
      throw new ExtractionConfigError('CONFIG_NOT_FOUND', `Workflow file not found: ${path}`)
    }
    const definition = parseWorkflowDefinition(this.parseConfigFile(readTextFile(path)))
    if (!definition.success) {
      throw new ExtractionConfigError(
        'VALIDATION_ERROR',
        `Invalid workflow: ${definition.issues.join('\n')}`,
      )
    }
    return definition.definition
  }

  private loadWorkflowGraph(
    graphPath: string,
    graphDefinition: Omit<WorkflowDefinition['graph'], 'outputPath'>,
  ): RiviereProject {
    if (!fileExists(graphPath)) return RiviereProject.start({ graphDefinition }).data
    const parsed = parseRiviereGraph(readJsonFile(graphPath, 'Rivière graph'))
    if (!parsed.success)
      throw new ExtractionConfigError(
        'VALIDATION_ERROR',
        `Invalid existing graph: ${parsed.issues.join('\n')}`,
      )
    return RiviereProject.rehydrate(parsed.graph, graphDefinition)
  }

  loadByGraphPath(graphFileLocation: string): RiviereProject {
    if (!fileExists(graphFileLocation)) throw new GraphNotFoundError(graphFileLocation)
    try {
      const result = parseRiviereGraph(readJsonFile(graphFileLocation, 'Rivière graph'))
      if (!result.success)
        throw new GraphCorruptedError(graphFileLocation, { cause: result.issues })
      return RiviereProject.rehydrate(result.graph)
    } catch (error) {
      if (!(error instanceof FileReadError)) throw error
      throw new GraphCorruptedError(graphFileLocation, { cause: error })
    }
  }

  private loadDraftComponents(path: string): readonly DraftComponent[] {
    try {
      const values = readJsonFile(path, 'Draft components')
      if (!Array.isArray(values)) {
        throw new DraftComponentsLoadError(`Draft components file must contain an array: ${path}`)
      }
      return values.map((value) => {
        const parsed = DraftComponent.parse(value)
        if (!parsed.success) {
          throw new DraftComponentsLoadError(`${parsed.error}: ${path}`)
        }
        return parsed.data
      })
    } catch (error) {
      if (error instanceof FileReadError) {
        throw new DraftComponentsLoadError(error.message)
      }
      throw error
    }
  }

  private translateDataAccessErrors<T>(load: () => T): T {
    try {
      return load()
    } catch (error) {
      if (error instanceof GitError) {
        throw new ExtractionDataAccessError(error.gitErrorCode, error.message)
      }
      throw error
    }
  }

  private loadParsedConfigState(configPath: string): ParsedConfigState {
    if (!fileExists(configPath))
      throw new ExtractionConfigError('CONFIG_NOT_FOUND', `Config file not found: ${configPath}`)

    const content = readTextFile(configPath)
    const parsed = this.parseConfigFile(content)
    const configDir = dirname(resolve(configPath))
    const expanded = this.expandModuleRefs(parsed, configDir)

    const extractionConfig = parseExtractionConfig(expanded)
    if (!extractionConfig.success)
      throw new ExtractionConfigError(
        'VALIDATION_ERROR',
        `Invalid extraction config:\n${formatExtractionConfigErrors(extractionConfig.errors)}`,
      )

    return {
      configDir,
      configuration: this.resolveConfiguration(extractionConfig.configuration, configDir),
    }
  }

  private parseConfigFile(content: string): unknown {
    try {
      return YamlDocumentReader.parse(content).value()
    } catch (error) {
      if (error instanceof YamlDocumentError) {
        throw new ExtractionConfigError('VALIDATION_ERROR', `Invalid config file: ${error.message}`)
      }
      throw new ExtractionConfigError('VALIDATION_ERROR', `Invalid config file: ${String(error)}`)
    }
  }

  private expandModuleRefs(config: unknown, configDir: string): unknown {
    try {
      if (!this.hasModulesArray(config)) return config

      return {
        ...config,
        modules: config.modules.map((item) => this.expandModuleRefItem(item, configDir)),
      }
    } catch (error) {
      throw new ExtractionConfigError(
        'VALIDATION_ERROR',
        `Error expanding module references: ${String(error)}`,
      )
    }
  }

  private expandModuleRefItem(item: unknown, configDir: string): unknown {
    if (!this.isModuleRef(item)) {
      return item
    }

    const refPath = resolve(configDir, item.$ref)
    if (!fileExists(refPath))
      throw new ExtractionConfigLoadError(
        `Cannot resolve module reference '${item.$ref}'. File not found: ${refPath}`,
      )

    const content = readTextFile(refPath)
    const parsed = YamlDocumentReader.parse(content).value()
    return parsed
  }

  private resolveConfiguration(
    config: DraftConfiguration,
    configDir: string,
  ): ValidatedConfiguration {
    const result = ValidatedConfiguration.parse({
      ...config,
      modules: config.modules.map((module) => this.resolveModule(module, configDir)),
    })
    if (!result.success)
      throw new ExtractionConfigError(
        'VALIDATION_ERROR',
        formatExtractionConfigErrors(result.errors),
      )
    if (result.data.modules.length === 0)
      throw new ExtractionConfigError('VALIDATION_ERROR', 'Config has no resolved modules')
    return result.data
  }

  private loadExtendedModule(source: string, configDir: string): ResolvedModuleDefaults {
    const filePath = resolveFileOrPackagePath({
      baseDirectory: configDir,
      packageRelativePath: 'src/published-language/default-extraction.config.json',
      source,
    })
    if (!fileExists(filePath))
      throw new ExtractionConfigLoadError(
        `Cannot resolve extends reference '${source}'. File not found: ${filePath}`,
      )

    const parsed = YamlDocumentReader.parse(readTextFile(filePath)).value()
    if (this.hasModulesArray(parsed)) {
      return this.resolveFirstModuleFromConfig(parsed, source, dirname(filePath))
    }
    if (this.isTopLevelRulesConfig(parsed)) {
      return this.topLevelRulesToModule(parsed)
    }
    const preview = JSON.stringify(parsed, null, 2).slice(0, 200)
    throw new ExtractionConfigLoadError(
      `Invalid extended config format in '${source}'. ` +
        `Expected object with 'modules' array or top-level component rules. Got: ${preview}`,
    )
  }

  private resolveFirstModuleFromConfig(
    parsed: { modules: unknown[] },
    source: string,
    configDir: string,
  ): ValidatedModuleInput {
    if (parsed.modules.length === 0)
      throw new ExtractionConfigLoadError(
        `Invalid extended config in '${source}': Config has empty modules array`,
      )

    const extractionConfig = parseExtractionConfig(parsed)
    if (!extractionConfig.success)
      throw new ExtractionConfigLoadError(
        `Invalid extended config in '${source}': ` +
          formatExtractionConfigErrors(extractionConfig.errors),
      )

    return this.resolveModule(extractionConfig.configuration.modules[0], configDir)
  }

  private topLevelRulesToModule(parsed: Partial<ValidatedModuleInput>): ResolvedModuleDefaults {
    return {
      api: parsed.api ?? NOT_USED,
      useCase: parsed.useCase ?? NOT_USED,
      domainOp: parsed.domainOp ?? NOT_USED,
      event: parsed.event ?? NOT_USED,
      eventHandler: parsed.eventHandler ?? NOT_USED,
      ui: parsed.ui ?? NOT_USED,
    }
  }

  private resolveModule(module: DraftModule, configDir: string): ValidatedModuleInput {
    const extendsSource = module.extends
    if (extendsSource === undefined) {
      return module
    }

    const baseModule = this.loadExtendedModule(extendsSource, configDir)
    const mergedCustomTypes =
      baseModule.customTypes === undefined && module.customTypes === undefined
        ? undefined
        : { ...baseModule.customTypes, ...module.customTypes }

    return {
      name: module.name,
      domain: module.domain,
      path: module.path,
      glob: module.glob,
      ...(module.modules !== undefined && { modules: module.modules }),
      api: module.api ?? baseModule.api,
      useCase: module.useCase ?? baseModule.useCase,
      domainOp: module.domainOp ?? baseModule.domainOp,
      event: module.event ?? baseModule.event,
      eventHandler: module.eventHandler ?? baseModule.eventHandler,
      ui: module.ui ?? baseModule.ui,
      ...(mergedCustomTypes !== undefined && { customTypes: mergedCustomTypes }),
    }
  }

  private resolveSourceFilePaths(
    parsedConfigState: ParsedConfigState,
  ): ReadonlyMap<ValidatedModule, string[]> {
    const sourceFilesByModule = globSourceFiles(
      parsedConfigState.configuration.modules,
      parsedConfigState.configDir,
    )
    const sourceFilePaths = [...sourceFilesByModule.values()].flat()

    if (sourceFilePaths.length === 0) {
      const patterns = parsedConfigState.configuration.modules
        .map((module) => `${module.path}/${module.glob}`)
        .join(', ')
      throw new ExtractionConfigError(
        'VALIDATION_ERROR',
        `No files matched extraction patterns: ${patterns}\nConfig directory: ${parsedConfigState.configDir}`,
      )
    }

    return sourceFilesByModule
  }

  private hasModulesArray(value: unknown): value is { modules: unknown[] } {
    return (
      typeof value === 'object' &&
      value !== null &&
      'modules' in value &&
      Array.isArray(value.modules)
    )
  }

  private isModuleRef(value: unknown): value is { $ref: string } {
    return (
      typeof value === 'object' &&
      value !== null &&
      '$ref' in value &&
      typeof value.$ref === 'string'
    )
  }

  private isTopLevelRulesConfig(value: unknown): value is Partial<ValidatedModuleInput> {
    return (
      typeof value === 'object' && value !== null && !Array.isArray(value) && !('modules' in value)
    )
  }
}
