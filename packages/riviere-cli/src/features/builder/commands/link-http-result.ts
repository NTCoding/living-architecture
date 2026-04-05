import type { Link } from '@living-architecture/riviere-schema'

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
export type LinkHttpResult =
  | {
    link: Link
    matchedApi: MatchedApi
    success: true
  }
  | {
    code: LinkHttpErrorCode
    message: string
    suggestions: string[]
    success: false
  }
