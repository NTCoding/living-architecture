import type { RiviereGraph } from '@living-architecture/riviere-schema'

/** @riviere-role command-use-case-result-value */
export type FinalizeGraphErrorCode = 'GRAPH_CORRUPTED' | 'GRAPH_NOT_FOUND' | 'VALIDATION_ERROR'

/** @riviere-role command-use-case-result-value */
export type FinalizedGraph = RiviereGraph

/** @riviere-role command-use-case-result */
export type FinalizeGraphResult =
  | {
    finalGraph: FinalizedGraph
    success: true
  }
  | {
    code: FinalizeGraphErrorCode
    message: string
    success: false
  }
