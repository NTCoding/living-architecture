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

interface ExtractDraftComponentsFullResult {
  kind: 'full'
  components: EnrichedComponent[]
  links: ExtractedLink[]
  timings: ConnectionTimings[]
  failedFields: string[]
}

interface ExtractDraftComponentsFieldFailureResult {
  kind: 'fieldFailure'
  failedFields: string[]
}

/** @riviere-role command-use-case-result */
export type ExtractDraftComponentsResult =
  | ExtractDraftComponentsDraftOnlyResult
  | ExtractDraftComponentsFullResult
  | ExtractDraftComponentsFieldFailureResult
