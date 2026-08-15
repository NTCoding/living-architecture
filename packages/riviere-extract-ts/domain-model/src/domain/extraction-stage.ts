import type {
  ValidatedConfiguration,
  ValidatedModule,
} from '@living-architecture/riviere-extract-config-published-language'
import type { Project } from 'ts-morph'

interface ModuleContext {
  readonly files: readonly string[]
  readonly module: ValidatedModule
  readonly project: Project
}

type ResolvedExtractionConfig = ValidatedConfiguration

interface ExtractionStageParams {
  readonly name: string
  readonly configPath: string
  readonly useTsConfig: boolean
  readonly repositoryName: string
  readonly resolvedConfig: ResolvedExtractionConfig
  readonly moduleContexts: readonly ModuleContext[]
}

/** @riviere-role value-object */
export class ExtractionStage {
  declare private brand: 'ExtractionStage'

  static parse(params: ExtractionStageParams): ExtractionStage {
    validateModuleContexts(params.resolvedConfig.modules, params.moduleContexts)
    return new ExtractionStage(params)
  }

  private constructor(params: ExtractionStageParams) {
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
    throw new TypeError('Module contexts must match resolved configuration exactly')
  }
  const contextModules = new Set(contexts.map((context) => context.module))
  const matchesExactly =
    contextModules.size === modules.length && modules.every((module) => contextModules.has(module))
  if (!matchesExactly) {
    throw new TypeError('Module contexts must match resolved configuration exactly')
  }
}
