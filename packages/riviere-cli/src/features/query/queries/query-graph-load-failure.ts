import { GraphCorruptedError } from '../data-access/graph/graph-corrupted-error'
import { GraphNotFoundError } from '../data-access/graph/graph-not-found-error'

/** @riviere-role query-model */
export type QueryGraphLoadFailure =
  | {
      readonly kind: 'graphCorrupted'
      readonly message: string
    }
  | {
      readonly kind: 'graphNotFound'
      readonly message: string
    }

/** @riviere-role query-model */
export function toQueryGraphLoadFailure(error: unknown): QueryGraphLoadFailure | undefined {
  if (error instanceof GraphNotFoundError) {
    return {
      kind: 'graphNotFound',
      message: error.message,
    }
  }

  if (error instanceof GraphCorruptedError) {
    return {
      kind: 'graphCorrupted',
      message: 'Graph file contains invalid JSON',
    }
  }

  return undefined
}
