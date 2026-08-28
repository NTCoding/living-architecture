import type { Link } from '@living-architecture/riviere-schema-published-language/schema'

/** @riviere-role command-use-case-result-value */
export type LinkComponentsErrorCode =
  | 'COMPONENT_NOT_FOUND'
  | 'GRAPH_CORRUPTED'
  | 'GRAPH_NOT_FOUND'
  | 'VALIDATION_ERROR'

/** @riviere-role command-use-case-result */
export interface LinkComponentsResult {
  readonly result:
    | {
        readonly link: Link
        readonly success: true
      }
    | {
        readonly code: LinkComponentsErrorCode
        readonly message: string
        readonly suggestions: string[]
        readonly success: false
      }
}
