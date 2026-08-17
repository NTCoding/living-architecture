import type { ExternalLink } from '@living-architecture/riviere-schema-published-language/schema'

/** @riviere-role command-use-case-result-value */
export type LinkExternalErrorCode =
  | 'COMPONENT_NOT_FOUND'
  | 'GRAPH_CORRUPTED'
  | 'GRAPH_NOT_FOUND'
  | 'VALIDATION_ERROR'

/** @riviere-role command-use-case-result */
export interface LinkExternalResult {
  readonly result:
    | {
        readonly externalLink: ExternalLink
        readonly success: true
      }
    | {
        readonly code: LinkExternalErrorCode
        readonly message: string
        readonly suggestions: string[]
        readonly success: false
      }
}
