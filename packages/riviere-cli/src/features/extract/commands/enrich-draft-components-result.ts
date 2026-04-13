import type {
  ConnectionTimings,
  DraftComponent,
  EnrichedComponent,
  ExtractedLink,
} from '@living-architecture/riviere-extract-ts'
import type { ExternalLink } from '@living-architecture/riviere-schema'

interface EnrichDraftComponentsDraftOnlyResult {
  kind: 'draftOnly'
  components: DraftComponent[]
}

interface EnrichDraftComponentsFullResult {
  kind: 'full'
  components: EnrichedComponent[]
  links: ExtractedLink[]
  externalLinks: ExternalLink[]
  timings: ConnectionTimings[]
  failedFields: string[]
}

interface EnrichDraftComponentsFieldFailureResult {
  kind: 'fieldFailure'
  failedFields: string[]
}

/** @riviere-role command-use-case-result */
export type EnrichDraftComponentsResult =
  | EnrichDraftComponentsDraftOnlyResult
  | EnrichDraftComponentsFullResult
  | EnrichDraftComponentsFieldFailureResult
