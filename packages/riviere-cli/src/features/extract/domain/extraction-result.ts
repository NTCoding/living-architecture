import type {
  ConnectionTimings,
  DraftComponent,
  EnrichedComponent,
  ExtractedLink,
} from '@living-architecture/riviere-extract-ts'

interface DraftOnlyResult {
  kind: 'draftOnly'
  components: DraftComponent[]
}

interface FullResult {
  kind: 'full'
  components: EnrichedComponent[]
  links: ExtractedLink[]
  timings: ConnectionTimings[]
  failedFields: string[]
}

export type ExtractionResult = DraftOnlyResult | FullResult
