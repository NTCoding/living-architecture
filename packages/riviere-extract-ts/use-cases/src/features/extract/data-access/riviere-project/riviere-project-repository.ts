import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import {
  ExtendingDraftModule,
  ExtractionConfig,
  ModuleDefaults,
  parseAiEnrichConfig,
  parseAiExtractConfig,
  parseAsyncApiImportConfig,
  parseEventCatalogImportConfig,
  parseWorkflowDefinition,
  ValidatedConfiguration,
  type CodeExtractionConfig,
  type ConfiguredWorkflowStageDefinition,
  type DraftConfiguration,
  type DraftModule,
  type RiviereProjectLoadInput,
  type ValidatedModule,
  type ValidatedModuleInput,
  type WorkflowDefinition,
  type WorkflowStageDefinition,
} from '@living-architecture/riviere-extract-config-published-language'
import { BuilderOptions } from '@living-architecture/riviere-builder-published-language'
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
import type { WorkflowStageValue } from '@living-architecture/riviere-extract-ts-domain-model/domain/workflow-stage'
import { DraftComponentsLoadError } from './draft-components-load-error'
import { InvalidExtractionConfigError } from './extraction-config-load-error'
import { parseRiviereGraph } from '@living-architecture/riviere-schema-published-language/validation'
import { globSourceFiles } from '../../../../infra/external-clients/glob/glob-source-files'
import {
  YamlDocumentError,
  YamlDocumentReader,
} from '../../../../infra/external-clients/yaml/yaml-document-reader'
import { GraphCorruptedError } from './graph-corrupted-error'
import { GraphNotFoundError } from './graph-not-found-error'

type LoadParameters = Readonly<{
  projectRoot: string
  configPath: string
  useTsConfig: boolean
  draftComponentsPath?: string
}>
type ParsedConfigState = Readonly<{ configDir: string; configuration: ValidatedConfiguration }>

/** @riviere-role aggregate-repository */
export class RiviereProjectRepository {
  save(graphFileLocation: string, project: RiviereProject): void {
    mkdirSync(dirname(graphFileLocation), { recursive: true })
    writeFileSync(graphFileLocation, project.serialize(), 'utf-8')
  }

  load(input: RiviereProjectLoadInput): RiviereProject {
    switch (input.kind) {
      case 'workflow':
        return this.loadWorkflow(input.workflowPath)
      case 'extraction':
        return this.loadExtraction(input)
      case 'graph':
        return this.loadGraph(input.graphFileLocation)
    }
  }

  private loadWorkflow(workflowPath: string): RiviereProject {
    const workflowFile = resolve(workflowPath)
    const workflowDirectory = dirname(workflowFile)
    const definition = this.loadWorkflowDefinition(workflowFile)
    const stages = definition.stages.map((stage) => this.materializeStage(stage, workflowDirectory))
    const graphPath = resolve(workflowDirectory, definition.output)
    const workflowInput = {
      name: definition.name,
      outputPath: graphPath,
      runLogDirectory: dirname(graphPath),
      stages,
    }
    if (fileExists(graphPath)) return this.rehydrateGraph(graphPath, workflowInput)
    const started = RiviereProject.start({
      graphDefinition: {
        name: definition.name,
        ...(definition.description === undefined ? {} : { description: definition.description }),
        sources: definition.sources,
        domains: definition.domains,
      },
      workflowInput,
    })
    if (!started.success) throw new ExtractionConfigError('VALIDATION_ERROR', started.error)
    return started.data
  }

  private rehydrateGraph(
    graphPath: string,
    workflowInput: NonNullable<Parameters<typeof RiviereProject.rehydrate>[2]>,
  ): RiviereProject {
    const parsed = parseRiviereGraph(this.readExistingGraph(graphPath))
    if (!parsed.success)
      throw new ExtractionConfigError(
        'VALIDATION_ERROR',
        `Invalid existing graph: ${parsed.issues.join('\n')}`,
      )
    return RiviereProject.rehydrate(
      parsed.graph,
      BuilderOptions.fromGraph(parsed.graph),
      workflowInput,
    )
  }

  private readExistingGraph(graphPath: string): unknown {
    try {
      return readJsonFile(graphPath, 'Rivière graph')
    } catch (error) {
      if (error instanceof FileReadError)
        throw new ExtractionConfigError(
          'VALIDATION_ERROR',
          `Invalid existing graph: ${error.message}`,
        )
      throw error
    }
  }

  private loadWorkflowDefinition(workflowPath: string): WorkflowDefinition {
    const definition = parseWorkflowDefinition(this.readConfigYaml(workflowPath))
    if (!definition.success)
      throw new ExtractionConfigError(
        'VALIDATION_ERROR',
        `Invalid workflow: ${definition.issues.join('\n')}`,
      )
    return definition.definition
  }

  private materializeStage(
    stage: WorkflowStageDefinition,
    workflowDirectory: string,
  ): WorkflowStage {
    if (stage.kind === 'schema-validate') {
      return WorkflowStage.fromMaterialized({ kind: 'schema-validate', name: stage.name })
    }
    return WorkflowStage.fromMaterialized(
      this.stageValue(stage, resolve(workflowDirectory, stage.config)),
    )
  }

  private stageValue(
    stage: ConfiguredWorkflowStageDefinition,
    configPath: string,
  ): WorkflowStageValue {
    const configDirectory = dirname(configPath)
    const file = this.readConfigYaml(configPath)
    switch (stage.kind) {
      case 'code-extraction':
        return {
          kind: 'code-extraction',
          name: stage.name,
          config: codeExtractionConfig(this.loadParsedConfigState(configPath)),
        }
      case 'eventcatalog-import': {
        const config = parseEventCatalogImportConfig(file)
        if (!config.success)
          throw new ExtractionConfigError('VALIDATION_ERROR', config.issues.join('\n'))
        return {
          kind: 'eventcatalog-import',
          name: stage.name,
          config: resolveImportConfig(config.config, configDirectory),
        }
      }
      case 'asyncapi-import': {
        const config = parseAsyncApiImportConfig(file)
        if (!config.success)
          throw new ExtractionConfigError('VALIDATION_ERROR', config.issues.join('\n'))
        return {
          kind: 'asyncapi-import',
          name: stage.name,
          config: resolveImportConfig(config.config, configDirectory),
        }
      }
      case 'ai-extract': {
        const config = parseAiExtractConfig(file)
        if (!config.success)
          throw new ExtractionConfigError('VALIDATION_ERROR', config.issues.join('\n'))
        return {
          kind: 'ai-extract',
          name: stage.name,
          config: resolveAiConfig(config.config, configDirectory),
        }
      }
      case 'ai-enrich': {
        const config = parseAiEnrichConfig(file)
        if (!config.success)
          throw new ExtractionConfigError('VALIDATION_ERROR', config.issues.join('\n'))
        return {
          kind: 'ai-enrich',
          name: stage.name,
          config: resolveAiConfig(config.config, configDirectory),
        }
      }
    }
  }

  private loadExtraction(input: LoadParameters): RiviereProject {
    const configuration = this.loadExtractionConfiguration(input)
    const draftComponents =
      input.draftComponentsPath === undefined
        ? []
        : this.loadDraftComponents(input.draftComponentsPath)
    const started = RiviereProject.start({ configuration, draftComponents })
    if (!started.success) throw new ExtractionConfigError('VALIDATION_ERROR', started.error)
    return started.data
  }

  private loadGraph(graphFileLocation: string): RiviereProject {
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

  private loadExtractionConfiguration(params: LoadParameters): ExtractionConfiguration {
    const configPath = resolve(params.projectRoot, params.configPath)
    const state = this.loadParsedConfigState(configPath)
    const sourceFilesByModule = this.resolveSourceFilePaths(state)
    const moduleSources = createTypeScriptProjects(
      state.configDir,
      sourceFilesByModule,
      params.useTsConfig,
    )
    return ExtractionConfiguration.parse({
      name: configPath,
      configPath,
      useTsConfig: params.useTsConfig,
      repositoryName: this.repositoryName(params.projectRoot),
      resolvedConfig: state.configuration,
      moduleContexts: [...moduleSources.entries()].map(([module, source]) => ({
        module,
        files: source.files,
        project: source.project,
      })),
    })
  }

  private repositoryName(projectRoot: string): string {
    try {
      return getRepositoryInfo('git', projectRoot).name
    } catch (error) {
      if (error instanceof GitError) {
        throw new ExtractionDataAccessError(error.gitErrorCode, error.message)
      }
      throw error
    }
  }

  private loadDraftComponents(path: string): readonly DraftComponent[] {
    try {
      const parsed = DraftComponent.parseMany(readJsonFile(path, 'Draft components'))
      if (!parsed.success) throw new DraftComponentsLoadError(`${parsed.error}: ${path}`)
      return parsed.draftComponents
    } catch (error) {
      if (error instanceof FileReadError) throw new DraftComponentsLoadError(error.message)
      throw error
    }
  }

  private loadParsedConfigState(configPath: string): ParsedConfigState {
    const configDir = dirname(resolve(configPath))
    const configuration = ExtractionConfig.parse(
      this.readConfigYaml(configPath),
      configDir,
      (referencePath) => {
        if (!fileExists(referencePath)) {
          throw new ExtractionConfigError(
            'VALIDATION_ERROR',
            `Cannot resolve module reference './${relative(configDir, referencePath)}'. File not found: ${referencePath}`,
          )
        }
        return this.readConfigYaml(referencePath)
      },
    )
    if (!configuration.success) throw new InvalidExtractionConfigError(configuration.errors)
    return {
      configDir,
      configuration: this.resolveConfiguration(
        configuration.configuration.draftConfiguration(),
        configDir,
      ),
    }
  }

  private readConfigFile(path: string): string {
    if (!fileExists(path))
      throw new ExtractionConfigError('CONFIG_NOT_FOUND', `Config file not found: ${path}`)
    return readTextFile(path)
  }

  private readConfigYaml(path: string): unknown {
    try {
      return YamlDocumentReader.parse(this.readConfigFile(path)).value()
    } catch (error) {
      if (error instanceof ExtractionConfigError) throw error
      if (error instanceof YamlDocumentError) {
        throw new ExtractionConfigError('VALIDATION_ERROR', `Invalid config file: ${error.message}`)
      }
      throw new ExtractionConfigError('VALIDATION_ERROR', `Invalid config file: ${String(error)}`)
    }
  }

  private resolveConfiguration(
    config: DraftConfiguration,
    configDir: string,
  ): ValidatedConfiguration {
    const result = ValidatedConfiguration.parse({
      ...config,
      modules: config.modules.map((module) => this.resolveModule(module, configDir)),
    })
    if (!result.success) throw new InvalidExtractionConfigError(result.errors)
    if (result.data.modules.length === 0)
      throw new ExtractionConfigError('VALIDATION_ERROR', 'Config has no resolved modules')
    return result.data
  }

  private resolveModule(module: DraftModule, configDir: string): ValidatedModuleInput {
    if (module.extends === undefined) return module
    return ExtendingDraftModule.from(module).merge(
      this.loadExtendedModule(module.extends, configDir),
    )
  }

  private loadExtendedModule(source: string, configDir: string): ModuleDefaults {
    const filePath = resolveFileOrPackagePath({
      baseDirectory: configDir,
      packageRelativePath: 'src/published-language/default-extraction.config.json',
      source,
    })
    if (!fileExists(filePath))
      throw new ExtractionConfigError(
        'VALIDATION_ERROR',
        `Cannot resolve extends reference '${source}'. File not found: ${filePath}`,
      )
    const parsed = this.readConfigYaml(filePath)
    const defaults = ModuleDefaults.parse(parsed)
    if (!defaults.success)
      throw new ExtractionConfigError(
        'VALIDATION_ERROR',
        `Invalid extended config in '${source}': ${defaults.issues.join('\n')}`,
      )
    if (defaults.source.kind === 'rules') return defaults.source.defaults
    return this.resolveFirstModuleDefaults(defaults.source.config, dirname(filePath))
  }

  private resolveFirstModuleDefaults(
    config: DraftConfiguration,
    configDir: string,
  ): ModuleDefaults {
    return ModuleDefaults.fromResolvedModule(this.resolveModule(config.modules[0], configDir))
  }

  private resolveSourceFilePaths(state: ParsedConfigState): ReadonlyMap<ValidatedModule, string[]> {
    const sourceFilesByModule = globSourceFiles(state.configuration.modules, state.configDir)
    if (
      sourceFilesByModule.size === 0 ||
      [...sourceFilesByModule.values()].every((files) => files.length === 0)
    )
      throw new ExtractionConfigError(
        'VALIDATION_ERROR',
        'No files matched extraction patterns: ' +
          state.configuration.modules.map((module) => `${module.path}/${module.glob}`).join(', ') +
          `\nConfig directory: ${state.configDir}`,
      )
    return sourceFilesByModule
  }
}

function codeExtractionConfig(state: ParsedConfigState): CodeExtractionConfig {
  return {
    modules: state.configuration.modules,
    connections: state.configuration.connections,
    schema: state.configuration.schema,
  }
}

function resolveImportConfig<
  C extends { source: string; mappings: string; allowUnmapped: boolean },
>(config: C, configDirectory: string): Pick<C, 'source' | 'mappings' | 'allowUnmapped'> {
  return {
    source: resolve(configDirectory, config.source),
    mappings: resolve(configDirectory, config.mappings),
    allowUnmapped: config.allowUnmapped,
  }
}

function resolveAiConfig<
  C extends { memory?: string; promptAppend?: string; sources: readonly string[] },
>(config: C, configDirectory: string): C {
  return {
    ...config,
    ...(config.memory === undefined ? {} : { memory: resolve(configDirectory, config.memory) }),
    ...(config.promptAppend === undefined
      ? {}
      : { promptAppend: resolve(configDirectory, config.promptAppend) }),
    sources: config.sources.map((source) => resolve(configDirectory, source)),
  }
}
