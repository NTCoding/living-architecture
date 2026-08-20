import { dirname, posix, resolve } from 'node:path'
import { parse as parseYaml } from 'yaml'
import { globSync } from 'glob'
import {
  type DraftConfiguration,
  type DraftModule,
  parseExtractionConfig,
  type ValidatedModuleInput,
  type ValidatedModule,
  ValidatedConfiguration,
  type ValidationError,
} from '@living-architecture/riviere-extract-config-published-language'
import { readTextFile } from '../../../../infra/external-clients/filesystem/file-reader'
import { fileExists } from '../../../../infra/external-clients/filesystem/file-existence'
import { resolveFileOrPackagePath } from '../../../../infra/external-clients/node-modules/node-module-file-resolver'
import { GitError } from '../../../../infra/external-clients/git/git-errors'
import { getRepositoryInfo } from '../../../../infra/external-clients/git/git-repository-info'
import { RiviereProject } from '@living-architecture/riviere-extract-ts-domain-model/domain/riviere-project'
import { ExtractionStage } from '@living-architecture/riviere-extract-ts-domain-model/domain/extraction-stage'
import { WorkflowDefinition } from '@living-architecture/riviere-extract-ts-domain-model/domain/workflow-definition'
import { WorkflowStage } from '@living-architecture/riviere-extract-ts-domain-model/domain/workflow-state'
import { createConfiguredProject } from '../../../../infra/external-clients/ts-morph/create-configured-project'
import { findModuleTsConfigDir } from '../../../../infra/external-clients/ts-morph/find-module-tsconfig-dir'
import { ExtractionConfigError } from './riviere-config-error'
import { ExtractionDataAccessError } from './riviere-project-error'
class ExtractionConfigLoadError extends Error {}
type ParsedConfigState = Readonly<{ configDir: string; configuration: ValidatedConfiguration }>
type ResolvedModuleDefaults = Pick<
  ValidatedModuleInput,
  'api' | 'useCase' | 'domainOp' | 'event' | 'eventHandler' | 'ui' | 'customTypes'
>
const NOT_USED = { notUsed: true } as const
const WORKFLOW_NAME = /^[a-z0-9][a-z0-9-]*$/
function formatExtractionConfigErrors(errors: readonly ValidationError[]): string {
  if (errors.length === 0) return 'validation failed without specific errors'
  return errors.map((error) => `${error.path}: ${error.message}`).join('\n')
}
/** @riviere-role aggregate-repository */
export class RiviereProjectRepository {
  load(
    params:
      | { projectRoot: string; configPath: string; useTsConfig: boolean }
      | { projectRoot: string; workflowName: string },
  ): RiviereProject {
    if ('workflowName' in params) return this.loadWorkflow(params)
    return this.translateDataAccessErrors(() => {
      const configPath = resolve(params.projectRoot, params.configPath)
      const parsedConfigState = this.loadParsedConfigState(configPath)
      const sourceFilesByModule = this.resolveSourceFilePaths(parsedConfigState)
      const stage = this.createExtractionStage(
        configPath,
        parsedConfigState,
        sourceFilesByModule,
        params.useTsConfig,
        params.projectRoot,
        configPath,
      )
      const projectResult = RiviereProject.parse({ stage })
      if (!projectResult.success)
        throw new ExtractionConfigError('VALIDATION_ERROR', projectResult.error)
      return projectResult.data
    })
  }

  private loadWorkflow(params: { projectRoot: string; workflowName: string }): RiviereProject {
    return this.translateDataAccessErrors(() => {
      if (!WORKFLOW_NAME.test(params.workflowName)) {
        throw new ExtractionConfigError(
          'VALIDATION_ERROR',
          `Invalid workflow name '${params.workflowName}'`,
        )
      }
      const workflowPath = resolve(
        params.projectRoot,
        '.riviere',
        'workflows',
        `${params.workflowName}.yaml`,
      )
      if (!fileExists(workflowPath)) {
        throw new ExtractionConfigError(
          'CONFIG_NOT_FOUND',
          `Workflow file not found: ${workflowPath}`,
        )
      }
      const workflowResult = WorkflowDefinition.parse(
        this.parseConfigFile(readTextFile(workflowPath)),
      )
      if (!workflowResult.success) {
        throw new ExtractionConfigError(
          'VALIDATION_ERROR',
          `Invalid workflow: ${workflowResult.error}`,
        )
      }
      const workflow = workflowResult.data
      const stages = workflow.stages.map((stage) =>
        this.materializeWorkflowStage(stage, params.projectRoot),
      )
      const projectResult = RiviereProject.parseWorkflow({
        graph: {
          ...workflow.graph,
          outputPath: resolve(params.projectRoot, workflow.graph.outputPath),
        },
        runLogDirectory: resolve(params.projectRoot, workflow.runLogDirectory),
        stages,
      })
      if (!projectResult.success) {
        throw new ExtractionConfigError('VALIDATION_ERROR', projectResult.error)
      }
      return projectResult.data
    })
  }

  private materializeWorkflowStage(
    stage: WorkflowDefinition['stages'][number],
    projectRoot: string,
  ) {
    if (stage.kind === 'validate') return WorkflowStage.parse({ kind: stage.kind })
    const configPath = resolve(projectRoot, stage.configPath)
    const parsedConfigState = this.loadParsedConfigState(configPath)
    const sourceFilesByModule = this.resolveSourceFilePaths(parsedConfigState)
    const extractionStage = this.createExtractionStage(
      configPath,
      parsedConfigState,
      sourceFilesByModule,
      true,
      projectRoot,
      stage.kind === 'extract' ? stage.name : 'link',
    )
    return WorkflowStage.parse({ kind: stage.kind, stage: extractionStage })
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
      return parseYaml(content)
    } catch (error) {
      throw new ExtractionConfigError('VALIDATION_ERROR', `Invalid config file: ${String(error)}`)
    }
  }

  private expandModuleRefs(config: unknown, configDir: string): unknown {
    try {
      if (!this.isRecord(config) || !Array.isArray(config['modules'])) return config
      return {
        ...config,
        modules: config['modules'].map((item) => this.expandModuleRefItem(item, configDir)),
      }
    } catch (error) {
      throw new ExtractionConfigError(
        'VALIDATION_ERROR',
        `Error expanding module references: ${String(error)}`,
      )
    }
  }

  private expandModuleRefItem(item: unknown, configDir: string): unknown {
    if (!this.isRecord(item) || typeof item['$ref'] !== 'string') return item
    const refPath = resolve(configDir, item['$ref'])
    if (!fileExists(refPath))
      throw new ExtractionConfigLoadError(
        `Cannot resolve module reference '${item['$ref']}'. File not found: ${refPath}`,
      )

    const content = readTextFile(refPath)
    const parsed: unknown = parseYaml(content)
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

    const parsed: unknown = parseYaml(readTextFile(filePath))
    if (this.isRecord(parsed) && Array.isArray(parsed['modules'])) {
      return this.resolveFirstModuleFromConfig(
        { modules: parsed['modules'] },
        source,
        dirname(filePath),
      )
    }
    if (this.isRecord(parsed) && !('modules' in parsed)) {
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

    const first = this.resolveConfiguration(extractionConfig.configuration, configDir).modules[0]
    if (first === undefined)
      throw new ExtractionConfigLoadError(
        `Invalid extended config in '${source}': Config has no resolved modules`,
      )
    return this.moduleInput(first)
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

  private createExtractionStage(
    configPath: string,
    parsedConfigState: ParsedConfigState,
    sourceFilesByModule: ReadonlyMap<ValidatedModule, string[]>,
    useTsConfig: boolean,
    projectRoot: string,
    name: string,
  ): ExtractionStage {
    const moduleSources = this.createModuleSources(
      parsedConfigState.configDir,
      sourceFilesByModule,
      useTsConfig,
    )
    const repositoryName = getRepositoryInfo('git', projectRoot).name
    return ExtractionStage.parse({
      name,
      configPath,
      useTsConfig,
      repositoryName,
      resolvedConfig: parsedConfigState.configuration,
      moduleContexts: [...moduleSources.entries()].map(([module, source]) => ({
        module,
        files: source.files,
        project: source.project,
      })),
    })
  }

  private resolveSourceFilePaths(
    parsedConfigState: ParsedConfigState,
  ): ReadonlyMap<ValidatedModule, string[]> {
    const sourceFilesByModule = new Map(
      parsedConfigState.configuration.modules.map((module) => [
        module,
        globSync(posix.join(module.path, module.glob), { cwd: parsedConfigState.configDir }).map(
          (filePath) => resolve(parsedConfigState.configDir, filePath),
        ),
      ]),
    )
    if ([...sourceFilesByModule.values()].flat().length === 0) {
      const patterns = parsedConfigState.configuration.modules
        .map((module) => posix.join(module.path, module.glob))
        .join(', ')
      throw new ExtractionConfigError(
        'VALIDATION_ERROR',
        `No files matched extraction patterns: ${patterns}\nConfig directory: ${parsedConfigState.configDir}`,
      )
    }

    return sourceFilesByModule
  }

  private createModuleSources(
    configDir: string,
    sourceFilesByModule: ReadonlyMap<ValidatedModule, string[]>,
    useTsConfig: boolean,
  ) {
    const sources = new Map<
      ValidatedModule,
      { files: string[]; project: ReturnType<typeof createConfiguredProject> }
    >()
    for (const [module, moduleFiles] of sourceFilesByModule) {
      const project = createConfiguredProject(
        findModuleTsConfigDir(configDir, module.path),
        !useTsConfig,
      )
      project.addSourceFilesAtPaths(moduleFiles)

      sources.set(module, { files: moduleFiles, project })
    }
    return sources
  }
  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
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

  private moduleInput(module: ValidatedModule): ValidatedModuleInput {
    return {
      name: module.name,
      domain: module.domain,
      path: module.path,
      glob: module.glob,
      ...(module.modules !== undefined && { modules: module.modules }),
      api: module.api,
      useCase: module.useCase,
      domainOp: module.domainOp,
      event: module.event,
      eventHandler: module.eventHandler,
      ui: module.ui,
      ...(module.customTypes !== undefined && { customTypes: module.customTypes }),
    }
  }
}
