import type {
  ConnectionTimings,
  DraftComponent,
  EnrichedComponent,
  ExtractedLink,
} from '@living-architecture/riviere-extract-ts'

interface DraftOnlyOutcome {
  kind: 'draftOnly'
  components: DraftComponent[]
}

interface FullExtractionOutcome {
  kind: 'full'
  components: EnrichedComponent[]
  failedFields: string[]
  links: ExtractedLink[]
  timings: ConnectionTimings[]
}

interface FieldFailureOutcome {
  kind: 'fieldFailure'
  failedFields: string[]
}

/** @riviere-role value-object */
export type ExtractionOutcome = DraftOnlyOutcome | FullExtractionOutcome | FieldFailureOutcome
