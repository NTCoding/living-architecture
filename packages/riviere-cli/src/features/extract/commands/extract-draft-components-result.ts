import type {
  ConnectionTimings,
  DraftComponent,
  EnrichedComponent,
  ExtractedLink,
} from '@living-architecture/riviere-extract-ts'

interface ExtractDraftComponentsDraftOnlyResult {
  kind: 'draftOnly'
  components: DraftComponent[]
}

export interface ExtractDraftComponentsFullResult {
  kind: 'full'
  components: EnrichedComponent[]
  links: ExtractedLink[]
  timings: ConnectionTimings[]
  failedFields: string[]
}

/** @riviere-role command-use-case-result */
export type ExtractDraftComponentsResult =
  | ExtractDraftComponentsDraftOnlyResult
  | ExtractDraftComponentsFullResult
