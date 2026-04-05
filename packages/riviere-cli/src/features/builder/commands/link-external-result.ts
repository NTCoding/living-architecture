import type { ExternalLink } from '@living-architecture/riviere-schema'

/** @riviere-role command-use-case-result-value */
export type LinkExternalErrorCode = 'COMPONENT_NOT_FOUND' | 'GRAPH_CORRUPTED' | 'GRAPH_NOT_FOUND'

/** @riviere-role command-use-case-result */
export type LinkExternalResult =
  | {
    externalLink: ExternalLink
    success: true
  }
  | {
    code: LinkExternalErrorCode
    message: string
    suggestions: string[]
    success: false
  }
