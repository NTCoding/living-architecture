import type { Link } from '@living-architecture/riviere-schema'

/** @riviere-role command-use-case-result-value */
export type LinkComponentsErrorCode = 'COMPONENT_NOT_FOUND' | 'GRAPH_CORRUPTED' | 'GRAPH_NOT_FOUND'

/** @riviere-role command-use-case-result */
export type LinkComponentsResult =
  | {
    link: Link
    success: true
  }
  | {
    code: LinkComponentsErrorCode
    message: string
    suggestions: string[]
    success: false
  }
