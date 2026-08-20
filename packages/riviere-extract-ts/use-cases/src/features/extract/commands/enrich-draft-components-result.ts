import type { ExternalLink } from '@living-architecture/riviere-schema-published-language/schema'
import type { DraftComponent } from '@living-architecture/riviere-extract-ts-domain-model/domain/component-extraction/draft-component'
import type { ConnectionTimings } from '@living-architecture/riviere-extract-ts-domain-model/domain/connection-detection/connection-detection-values'
import type { ExtractedLink } from '@living-architecture/riviere-extract-ts-domain-model/domain/connection-detection/extracted-link'
import type { EnrichedComponent } from '@living-architecture/riviere-extract-ts-domain-model/domain/value-extraction/enriched-component'

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

interface EnrichDraftComponentsDraftComponentsFailureResult {
  kind: 'draftComponentsFailure'
  message: string
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

interface EnrichDraftComponentsDataAccessFailureResult {
  kind: 'dataAccessFailure'
  code:
    | 'BASE_BRANCH_NOT_FOUND'
    | 'FILE_READ_ERROR'
    | 'GIT_NOT_FOUND'
    | 'NOT_A_REPOSITORY'
    | 'NO_REMOTE'
  message: string
}

/** @riviere-role command-use-case-result */
export interface EnrichDraftComponentsResult {
  readonly result:
    | EnrichDraftComponentsDraftOnlyResult
    | EnrichDraftComponentsFullResult
    | EnrichDraftComponentsFieldFailureResult
    | EnrichDraftComponentsDraftComponentsFailureResult
    | EnrichDraftComponentsConfigFailureResult
    | EnrichDraftComponentsConnectionFailureResult
    | EnrichDraftComponentsDataAccessFailureResult
}
