import type { ExternalLink } from '@living-architecture/riviere-schema-published-language/schema'
import type { DraftComponent } from '@living-architecture/riviere-extract-ts-domain-model/domain/component-extraction/draft-component'
import type { ConnectionTimings } from '@living-architecture/riviere-extract-ts-domain-model/domain/connection-detection/connection-detection-values'
import type { ExtractedLink } from '@living-architecture/riviere-extract-ts-domain-model/domain/connection-detection/extracted-link'
import type { EnrichedComponent } from '@living-architecture/riviere-extract-ts-domain-model/domain/value-extraction/enriched-component'

interface ExtractDraftComponentsDraftOnlyResult {
  kind: 'draftOnly'
  components: readonly DraftComponent[]
}

interface ExtractDraftComponentsFullResult {
  kind: 'full'
  components: readonly EnrichedComponent[]
  links: readonly ExtractedLink[]
  externalLinks: readonly ExternalLink[]
  timings: readonly ConnectionTimings[]
  failedFields: readonly string[]
}

interface ExtractDraftComponentsFieldFailureResult {
  kind: 'fieldFailure'
  failedFields: readonly string[]
}

interface ExtractDraftComponentsDraftComponentsFailureResult {
  kind: 'draftComponentsFailure'
  message: string
}

interface ExtractDraftComponentsConfigFailureResult {
  kind: 'configFailure'
  code: 'CONFIG_NOT_FOUND' | 'VALIDATION_ERROR'
  message: string
}

interface ExtractDraftComponentsConnectionFailureResult {
  kind: 'connectionDetectionFailure'
  message: string
}

interface ExtractDraftComponentsDataAccessFailureResult {
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
export interface ExtractDraftComponentsResult {
  readonly outputPath?: string
  readonly warnings: readonly string[]
  readonly result:
    | ExtractDraftComponentsDraftOnlyResult
    | ExtractDraftComponentsFullResult
    | ExtractDraftComponentsFieldFailureResult
    | ExtractDraftComponentsDraftComponentsFailureResult
    | ExtractDraftComponentsConfigFailureResult
    | ExtractDraftComponentsConnectionFailureResult
    | ExtractDraftComponentsDataAccessFailureResult
}
