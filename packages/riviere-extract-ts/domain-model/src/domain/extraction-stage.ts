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

type ModuleContextIndexInput = {
  readonly modules: readonly ValidatedModule[]
  readonly contexts: readonly ModuleContext[]
}

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
    const modules = params.resolvedConfig.modules
    validateModuleContexts(modules, params.moduleContexts)
    return new ExtractionStage(params)
  }

  private constructor(params: ExtractionStageParams) {
    Object.assign(this, params)
  }

  declare readonly name: string
  declare readonly configPath: string
  declare readonly useTsConfig: boolean
  declare readonly repositoryName: string
  declare readonly resolvedConfig: ResolvedExtractionConfig
  declare readonly moduleContexts: readonly ModuleContext[]
}

function validateModuleContexts(
  modules: readonly ValidatedModule[],
  contexts: readonly ModuleContext[],
): void {
  if (indexesForContexts({ modules, contexts }) !== indexesForModules(modules)) {
    throw new TypeError('Module contexts must match resolved configuration exactly')
  }
}

function indexesForModules(modules: readonly ValidatedModule[]): string {
  const indexes = modules.map((_, index) => index)
  return indexes.join(',')
}

function indexesForContexts(input: ModuleContextIndexInput): string {
  const { modules, contexts } = input
  const indexes: number[] = []
  for (const context of contexts) {
    const module = context.module
    const moduleIndex = modules.indexOf(module)
    indexes.push(moduleIndex)
  }
  indexes.sort((left, right) => left - right)
  return indexes.join(',')
}
