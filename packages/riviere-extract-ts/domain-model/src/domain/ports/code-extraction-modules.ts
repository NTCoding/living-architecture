import type { EnrichedComponent, EnrichmentFailure } from '../value-extraction/enriched-component'

interface CodeExtractionModule {
  extractAllDraftComponents(): void
  draftComponents(): readonly object[]
  owns(component: { domain: string; location: { file: string }; module: string }): boolean
  typeScriptProject(): import('ts-morph').Project
  sourceFilePaths(): readonly string[]
  enrichDraftComponents(): {
    components: EnrichedComponent[]
    failures: readonly EnrichmentFailure[]
  }
}

/** @riviere-role value-object */
export class CodeExtractionModules {
  declare private readonly brand: 'CodeExtractionModules'
  private constructor(private readonly modules: readonly CodeExtractionModule[]) {}
  static from(modules: readonly CodeExtractionModule[]): CodeExtractionModules {
    return new CodeExtractionModules([...modules])
  }
  map<T>(transform: (module: CodeExtractionModule) => T): T[] {
    return this.modules.map(transform)
  }
  filter(predicate: (module: CodeExtractionModule) => boolean): CodeExtractionModules {
    return CodeExtractionModules.from(this.modules.filter(predicate))
  }
}
