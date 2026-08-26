import type {
  ValidatedConfiguration,
  ValidatedModule,
} from '@living-architecture/riviere-extract-config-published-language'
import type { Project } from 'ts-morph'
import { ModuleContextsMismatchError } from './extraction-errors'

interface ModuleContext {
  readonly files: readonly string[]
  readonly module: ValidatedModule
  readonly project: Project
}

type ResolvedExtractionConfig = ValidatedConfiguration

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
  declare private brand: 'ExtractionConfiguration'

  static parse(params: ExtractionConfigurationParams): ExtractionConfiguration {
    validateModuleContexts(params.resolvedConfig.modules, params.moduleContexts)
    return new ExtractionConfiguration(params)
  }

  private constructor(params: ExtractionConfigurationParams) {
    this.name = params.name
    this.configPath = params.configPath
    this.useTsConfig = params.useTsConfig
    this.repositoryName = params.repositoryName
    this.resolvedConfig = params.resolvedConfig
    this.moduleContexts = params.moduleContexts
  }

  readonly name: string
  readonly configPath: string
  readonly useTsConfig: boolean
  readonly repositoryName: string
  readonly resolvedConfig: ResolvedExtractionConfig
  readonly moduleContexts: readonly ModuleContext[]
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
