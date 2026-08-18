import type { RiviereGraph } from '@living-architecture/riviere-schema-published-language/schema'

/** @riviere-role command-use-case-result-value */
export type FinalizeGraphErrorCode = 'GRAPH_CORRUPTED' | 'GRAPH_NOT_FOUND' | 'VALIDATION_ERROR'

/** @riviere-role command-use-case-result-value */
export type FinalizedGraph = RiviereGraph

/** @riviere-role command-use-case-result */
export interface FinalizeGraphResult {
  readonly result:
    | {
        readonly finalGraph: FinalizedGraph
        readonly success: true
      }
    | {
        readonly code: FinalizeGraphErrorCode
        readonly message: string
        readonly success: false
      }
}
