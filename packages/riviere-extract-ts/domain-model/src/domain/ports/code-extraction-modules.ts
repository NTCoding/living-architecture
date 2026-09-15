import type { EnrichedComponent, EnrichmentFailure } from '../value-extraction/enriched-component'
/**
 * @riviere-role domain-port
 * @riviere-role-justification This port exposes stage-local parser-backed module operations; these are runtime extraction collaborators, not previously created aggregate state that repository loading should persist.
 */
export type CodeExtractionModules = readonly {
  extractAllDraftComponents(): void
  draftComponents(): readonly object[]
  owns(component: { domain: string; location: { file: string }; module: string }): boolean
  typeScriptProject(): import('ts-morph').Project
  sourceFilePaths(): readonly string[]
  enrichDraftComponents(): {
    components: EnrichedComponent[]
    failures: readonly EnrichmentFailure[]
  }
}[]
