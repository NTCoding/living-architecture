import type {
  CodeExtractionConfig,
  ValidatedModule,
} from '@living-architecture/riviere-extract-config-published-language'
import type { Project } from 'ts-morph'
import type { RiviereProjectCollaborators } from './ports/load-event-catalog-source'
import { MissingModuleSourceError, ModuleContextsMismatchError } from './extraction-errors'

interface ModuleContext {
  readonly files: readonly string[]
  readonly module: ValidatedModule
  readonly project: Project
}

type ResolvedExtractionConfig = CodeExtractionConfig

interface ExtractionConfigurationParams {
  readonly name: string
  readonly configPath: string
  readonly useTsConfig: boolean
  readonly repositoryName: string
  readonly resolvedConfig: ResolvedExtractionConfig
  readonly moduleContexts: readonly ModuleContext[]
}

/** @riviere-role value-object */
export class ExtractionConfiguration {
  declare private readonly brand: 'ExtractionConfiguration'

  static parse(params: ExtractionConfigurationParams): ExtractionConfiguration {
    validateModuleContexts(params.resolvedConfig.modules, params.moduleContexts)
    return new ExtractionConfiguration(params)
  }

  static fromCodeExtractionStage(
    config: CodeExtractionConfig,
    configPath: string,
    collaborators: Pick<RiviereProjectCollaborators, 'repositoryName' | 'loadCodeExtraction'>,
  ): ExtractionConfiguration {
    const repositoryName = collaborators.repositoryName
    const useTsConfig = true
    return ExtractionConfiguration.parse({
      name: configPath,
      configPath,
      useTsConfig,
      repositoryName,
      resolvedConfig: config,
      moduleContexts: collaborators.loadCodeExtraction({
        config,
        configPath,
        repositoryName,
        useTsConfig,
      }),
    })
  }

  private constructor(params: ExtractionConfigurationParams) {
    this.name = params.name
    this.configPath = params.configPath
    this.useTsConfig = params.useTsConfig
    this.repositoryName = params.repositoryName
    this.allowIncomplete = params.resolvedConfig.allowIncomplete === true
    this.resolvedConfig = params.resolvedConfig
    this.moduleContexts = params.moduleContexts
  }

  readonly name: string
  readonly configPath: string
  readonly useTsConfig: boolean
  readonly repositoryName: string
  readonly allowIncomplete: boolean
  readonly resolvedConfig: ResolvedExtractionConfig
  readonly moduleContexts: readonly ModuleContext[]

  assertEveryModuleHasSource(modules: ReadonlyArray<Readonly<{ name(): string }>>): void {
    for (const configuredModule of this.resolvedConfig.modules) {
      if (!modules.some((module) => module.name() === configuredModule.name)) {
        throw new MissingModuleSourceError(configuredModule.name)
      }
    }
  }
}

function validateModuleContexts(
  modules: readonly ValidatedModule[],
  contexts: readonly ModuleContext[],
): void {
  if (modules.length !== contexts.length) {
    throw new ModuleContextsMismatchError()
  }
  const contextModules = new Set(contexts.map((context) => context.module))
  const matchesExactly =
    contextModules.size === modules.length && modules.every((module) => contextModules.has(module))
  if (!matchesExactly) {
    throw new ModuleContextsMismatchError()
  }
}
