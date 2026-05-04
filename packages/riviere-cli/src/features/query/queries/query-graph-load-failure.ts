import { GraphCorruptedError } from '../../../platform/domain/graph-corrupted-error'
import { GraphNotFoundError } from '../../../platform/domain/graph-not-found-error'
import type { RiviereQuery } from '@living-architecture/riviere-query'
import { RiviereQueryRepository } from '../infra/persistence/riviere-query-repository'

/** @riviere-role query-model */
export type QueryGraphLoadFailure = {
  readonly kind: 'graphCorrupted'
  readonly message: string
}

/** @riviere-role query-model */
export type LoadedQueryGraph =
  | {
    readonly kind: 'loaded'
    readonly query: RiviereQuery
  }
  | QueryGraphLoadFailure
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

/** @riviere-role query-model */
export function loadQueryGraph(
  repository: RiviereQueryRepository,
  graphPathOption: string | undefined,
): LoadedQueryGraph {
  try {
    return {
      kind: 'loaded',
      query: repository.load(graphPathOption),
    }
  } catch (error) {
    const failure = toQueryGraphLoadFailure(error)
    if (failure !== undefined) {
      return failure
    }
    throw error
  }
}
