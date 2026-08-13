import type { ExternalLink } from '@living-architecture/riviere-schema/schema'
import type { DraftComponent } from '@living-architecture/riviere-extract-ts/domain/component-extraction/draft-component'
import type { ConnectionTimings } from '@living-architecture/riviere-extract-ts/domain/connection-detection/connection-detection-values'
import type { ExtractedLink } from '@living-architecture/riviere-extract-ts/domain/connection-detection/extracted-link'
import type { EnrichedComponent } from '@living-architecture/riviere-extract-ts/domain/value-extraction/enriched-component'

interface EnrichDraftComponentsDraftOnlyResult {
  kind: 'draftOnly'
  components: readonly DraftComponent[]
}

interface EnrichDraftComponentsFullResult {
  kind: 'full'
  components: readonly EnrichedComponent[]
  links: readonly ExtractedLink[]
  externalLinks: readonly ExternalLink[]
  timings: readonly ConnectionTimings[]
  failedFields: readonly string[]
}

interface EnrichDraftComponentsFieldFailureResult {
  kind: 'fieldFailure'
  failedFields: readonly string[]
}

interface EnrichDraftComponentsConfigFailureResult {
  kind: 'configFailure'
  code: 'CONFIG_NOT_FOUND' | 'VALIDATION_ERROR'
  message: string
}

interface EnrichDraftComponentsConnectionFailureResult {
  kind: 'connectionDetectionFailure'
  message: string
}

/** @riviere-role command-use-case-result */
export type EnrichDraftComponentsResult =
  | EnrichDraftComponentsDraftOnlyResult
  | EnrichDraftComponentsFullResult
  | EnrichDraftComponentsFieldFailureResult
  | EnrichDraftComponentsConfigFailureResult
  | EnrichDraftComponentsConnectionFailureResult
