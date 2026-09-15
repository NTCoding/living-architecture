import { dirname, relative, resolve } from 'node:path'
import {
  ExtendingDraftModule,
  ExtractionConfig,
  ModuleDefaults,
  parseAiEnrichConfig,
  parseAiExtractConfig,
  parseAsyncApiImportConfig,
  parseAsyncApiMappings,
  parseEventCatalogImportConfig,
  parseEventCatalogMappings,
  parseWorkflowDefinition,
  ValidatedConfiguration,
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
import * as fileReader from '../../../../infra/external-clients/filesystem/file-reader'
import { fileExists } from '../../../../infra/external-clients/filesystem/file-existence'
import { writeTextFile } from '../../../../infra/external-clients/filesystem/text-file-writer'
import { readConfigYaml } from '../../../../infra/external-clients/config/config-file-reader'
import { resolveAiConfig } from '../../../../infra/external-clients/config/config-path-resolution'
import { resolveFileOrPackagePath } from '../../../../infra/external-clients/node-modules/node-module-file-resolver'
import { globSourceFiles } from '../../../../infra/external-clients/glob/glob-source-files'
import { GitError } from '../../../../infra/external-clients/git/git-errors'
import { getRepositoryInfo } from '../../../../infra/external-clients/git/git-repository-info'
import { RiviereProject } from '@living-architecture/riviere-extract-ts-domain-model/domain/riviere-project'
import type {
  RiviereProjectCollaborators,
  RiviereProjectRepositoryCollaborators,
} from '@living-architecture/riviere-extract-ts-domain-model/domain/riviere-project'
import {
  ExtractionProjectStartInput,
  GraphWithWorkflowStartInput,
  WorkflowStartInput,
} from '@living-architecture/riviere-extract-ts-domain-model/domain/riviere-project-start-inputs'
import { ExtractionConfiguration } from '@living-architecture/riviere-extract-ts-domain-model/domain/extraction-configuration'
import { ExtractionConfigError } from './riviere-config-error'
import { ExtractionDataAccessError } from './riviere-project-error'
import { DraftComponent } from '@living-architecture/riviere-extract-ts-domain-model/domain/component-extraction/draft-component'
import { WorkflowStage } from '@living-architecture/riviere-extract-ts-domain-model/domain/workflow-stage'
import type { WorkflowStageValue } from '@living-architecture/riviere-extract-ts-domain-model/domain/workflow-stage'
import { DraftComponentsLoadError } from './draft-components-load-error'
import { InvalidExtractionConfigError } from './extraction-config-load-error'
import { parseRiviereGraph } from '@living-architecture/riviere-schema-published-language/validation'
import { GraphCorruptedError } from './graph-corrupted-error'
import { GraphNotFoundError } from './graph-not-found-error'

type LoadParameters = Extract<RiviereProjectLoadInput, { kind: 'extraction' }>
type ParsedConfigState = Readonly<{ configDir: string; configuration: ValidatedConfiguration }>

type StageConfigParseResult<TSuccess> =
  | (TSuccess & { readonly success: true })
  | { readonly success: false; readonly issues: readonly string[] }

function validationError(reason: string): ExtractionConfigError {
  return new ExtractionConfigError('VALIDATION_ERROR', reason)
}

function requireStageConfig<TSuccess>(
  result: StageConfigParseResult<TSuccess>,
  failureLabel = '',
): TSuccess {
  if (!result.success)
    throw validationError(`${failureLabel}${result.issues.join('\n')}`)
  return result
}

/** @riviere-role aggregate-repository */
export class RiviereProjectRepository {
  constructor(private readonly collaborators: RiviereProjectRepositoryCollaborators) {}
  save(graphFileLocation: string, project: RiviereProject): void {
    writeTextFile(graphFileLocation, project.serialize())
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
    const collaborators = this.projectCollaborators(this.repositoryName(workflowDirectory))
    const workflowInput = WorkflowStartInput.from({
      name: definition.name,
      outputPath: graphPath,
      runLogDirectory: dirname(graphPath),
      stages,
    })
    if (fileExists(graphPath)) return this.rehydrateGraph(graphPath, workflowInput, collaborators)
    return RiviereProject.start(
      GraphWithWorkflowStartInput.from(
        {
          name: definition.name,
          ...(definition.description === undefined ? {} : { description: definition.description }),
          sources: definition.sources,
          domains: definition.domains,
        },
        workflowInput,
      ),
      collaborators,
    )
  }
  private rehydrateGraph(
    graphPath: string,
    workflowInput: WorkflowStartInput,
    collaborators: RiviereProjectCollaborators,
  ): RiviereProject {
    const parsed = parseRiviereGraph(this.readExistingGraph(graphPath))
    if (!parsed.success)
      throw validationError(`Invalid existing graph: ${parsed.issues.join('\n')}`)
    return RiviereProject.rehydrate(
      parsed.graph,
      collaborators,
      BuilderOptions.fromGraph(parsed.graph),
      workflowInput,
    )
  }
  private readExistingGraph(graphPath: string): unknown {
    try {
      return fileReader.readJsonFile(graphPath, 'Rivière graph')
    } catch (error) {
      if (error instanceof fileReader.FileReadError)
        throw validationError(`Invalid existing graph: ${error.message}`)
      throw error
    }
  }
  private loadWorkflowDefinition(workflowPath: string): WorkflowDefinition {
    const definition = parseWorkflowDefinition(this.readConfigYaml(workflowPath))
    if (!definition.success) {
      const reason = `Invalid workflow: ${definition.issues.join('\n')}`
      throw validationError(reason)
    }
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
      this.stageValue(stage, resolve(workflowDirectory, stage.config), workflowDirectory),
    )
  }

  private stageValue(
    stage: ConfiguredWorkflowStageDefinition,
    configPath: string,
    workflowDirectory: string,
  ): WorkflowStageValue {
    const configDirectory = dirname(configPath)
    const file = this.readConfigYaml(configPath)
    switch (stage.kind) {
      case 'code-extraction':
        return this.codeExtractionStageValue(stage.name, configPath)
      case 'eventcatalog-import': {
        const config = requireStageConfig(parseEventCatalogImportConfig(file))
        const mappings = requireStageConfig(
          parseEventCatalogMappings(
            this.readConfigYaml(resolve(configDirectory, config.config.mappings)),
          ),
          'Invalid EventCatalog mappings: ',
        )
        const source = resolve(configDirectory, config.config.source)
        return {
          kind: 'eventcatalog-import',
          name: stage.name,
          config: {
            source,
            sourceFilePath: relative(workflowDirectory, source),
            mappings: mappings.mappings,
            allowUnmapped: config.config.allowUnmapped,
          },
        }
      }
      case 'asyncapi-import': {
        const config = requireStageConfig(parseAsyncApiImportConfig(file))
        const mappings = requireStageConfig(
          parseAsyncApiMappings(
            this.readConfigYaml(resolve(configDirectory, config.config.mappings)),
          ),
          'Invalid AsyncAPI mappings: ',
        )
        const source = resolve(configDirectory, config.config.source)
        return {
          kind: 'asyncapi-import',
          name: stage.name,
          config: {
            source,
            sourceFilePath: relative(workflowDirectory, source),
            mappings: mappings.mappings,
            allowUnmapped: config.config.allowUnmapped,
          },
        }
      }
      case 'ai-extract': {
        const config = requireStageConfig(parseAiExtractConfig(file))
        return {
          kind: 'ai-extract',
          name: stage.name,
          config: resolveAiConfig(config.config, configDirectory),
        }
      }
      case 'ai-enrich': {
        const config = requireStageConfig(parseAiEnrichConfig(file))
        return {
          kind: 'ai-enrich',
          name: stage.name,
          config: resolveAiConfig(config.config, configDirectory),
        }
      }
    }
  }

  private codeExtractionStageValue(name: string, configPath: string): WorkflowStageValue {
    const state = this.loadParsedConfigState(configPath)
    this.resolveSourceFilePaths(state)
    return { kind: 'code-extraction', name, configPath, config: state.configuration }
  }
  private loadExtraction(input: LoadParameters): RiviereProject {
    const configuration = this.loadExtractionConfiguration(input)
    const draftComponents =
      input.draftComponentsPath === undefined
        ? []
        : this.loadDraftComponents(input.draftComponentsPath)
    return RiviereProject.start(
      ExtractionProjectStartInput.from(configuration, draftComponents),
      this.projectCollaborators(configuration.repositoryName),
    )
  }

  private projectCollaborators(repositoryName: string): RiviereProjectCollaborators {
    return { ...this.collaborators, repositoryName }
  }

  private loadGraph(graphFileLocation: string): RiviereProject {
    if (!fileExists(graphFileLocation)) throw new GraphNotFoundError(graphFileLocation)
    try {
      const result = parseRiviereGraph(fileReader.readJsonFile(graphFileLocation, 'Rivière graph'))
      if (!result.success)
        throw new GraphCorruptedError(graphFileLocation, { cause: result.issues })
      return RiviereProject.rehydrate(
        result.graph,
        this.projectCollaborators(graphFileLocation),
      )
    } catch (error) {
      if (!(error instanceof fileReader.FileReadError)) throw error
      throw new GraphCorruptedError(graphFileLocation, { cause: error })
    }
  }

  private loadExtractionConfiguration(params: LoadParameters): ExtractionConfiguration {
    const configPath = resolve(params.projectRoot, params.configPath)
    const state = this.loadParsedConfigState(configPath)
    this.resolveSourceFilePaths(state)
    return ExtractionConfiguration.parse({
      name: configPath,
      configPath,
      useTsConfig: params.useTsConfig,
      repositoryName: this.repositoryName(params.projectRoot),
      resolvedConfig: state.configuration,
      moduleContexts: this.collaborators.loadCodeExtraction({
        config: state.configuration,
        configPath,
        repositoryName: this.repositoryName(params.projectRoot),
        useTsConfig: params.useTsConfig,
      }),
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
      const parsed = DraftComponent.parseMany(fileReader.readJsonFile(path, 'Draft components'))
      if (!parsed.success) throw new DraftComponentsLoadError(`${parsed.error}: ${path}`)
      return parsed.draftComponents
    } catch (error) {
      if (error instanceof fileReader.FileReadError)
        throw new DraftComponentsLoadError(error.message)
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
          throw validationError(`Cannot resolve module reference './${relative(configDir, referencePath)}'. File not found: ${referencePath}`)
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

  private readConfigYaml(path: string): unknown {
    const result = readConfigYaml(path)
    if (!result.success) {
      throw new ExtractionConfigError(result.code, result.message)
    }
    return result.value
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
      throw validationError('Config has no resolved modules')
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
      throw validationError(`Cannot resolve extends reference '${source}'. File not found: ${filePath}`)
    const parsed = this.readConfigYaml(filePath)
    const defaults = ModuleDefaults.parse(parsed)
    if (!defaults.success)
      throw validationError(`Invalid extended config in '${source}': ${defaults.issues.join('\n')}`)
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
      throw validationError('No files matched extraction patterns: ' +
          state.configuration.modules.map((module) => `${module.path}/${module.glob}`).join(', ') +
          `\nConfig directory: ${state.configDir}`)
    return sourceFilesByModule
  }
}
