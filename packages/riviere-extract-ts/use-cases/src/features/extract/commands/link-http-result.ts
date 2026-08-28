import type { Link } from '@living-architecture/riviere-schema-published-language/schema'

/** @riviere-role command-use-case-result-value */
export interface MatchedApi {
  id: string
  method: string | undefined
  path: string
}

/** @riviere-role command-use-case-result-value */
export type LinkHttpErrorCode =
  | 'AMBIGUOUS_API_MATCH'
  | 'COMPONENT_NOT_FOUND'
  | 'GRAPH_CORRUPTED'
  | 'GRAPH_NOT_FOUND'
  | 'VALIDATION_ERROR'

/** @riviere-role command-use-case-result */
export interface LinkHttpResult {
  readonly result:
    | {
        readonly link: Link
        readonly matchedApi: MatchedApi
        readonly success: true
      }
    | {
        readonly code: LinkHttpErrorCode
        readonly message: string
        readonly suggestions: string[]
        readonly success: false
      }
}
