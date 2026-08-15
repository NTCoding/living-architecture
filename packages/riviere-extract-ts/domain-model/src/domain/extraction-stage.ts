import type {
  ValidatedConfiguration,
  ValidatedModule,
} from '@living-architecture/riviere-extract-config-published-language'
import type { Project } from 'ts-morph'

/** @riviere-role value-object */
interface ModuleContext {
  readonly files: readonly string[]
  readonly module: ValidatedModule
  readonly project: Project
}

type ResolvedExtractionConfig = ValidatedConfiguration

/** @riviere-role value-object */
export class ExtractionStage {
  declare private brand: 'ExtractionStage'

  static parse(params: {
    name: string
    configPath: string
    useTsConfig: boolean
    repositoryName: string
    resolvedConfig: ResolvedExtractionConfig
    moduleContexts: readonly ModuleContext[]
  }): ExtractionStage {
    return new ExtractionStage(params)
  }

  private constructor(params: {
    name: string
    configPath: string
    useTsConfig: boolean
    repositoryName: string
    resolvedConfig: ResolvedExtractionConfig
    moduleContexts: readonly ModuleContext[]
  }) {
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
