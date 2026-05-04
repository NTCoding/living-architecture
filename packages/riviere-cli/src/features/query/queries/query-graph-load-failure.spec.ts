import {
  describe, expect, it 
} from 'vitest'
import { GraphCorruptedError } from '../../../platform/domain/graph-corrupted-error'
import { GraphNotFoundError } from '../../../platform/domain/graph-not-found-error'
import { RiviereQuery } from '@living-architecture/riviere-query'
import { RiviereQueryRepository } from '../infra/persistence/riviere-query-repository'
import {
  loadQueryGraph, toQueryGraphLoadFailure 
} from './query-graph-load-failure'

class UnexpectedQueryGraphLoadError extends Error {
  constructor() {
    super('boom')
    this.name = 'UnexpectedQueryGraphLoadError'
  }
}

class ReturningRepository extends RiviereQueryRepository {
  override load(): RiviereQuery {
    return RiviereQuery.fromJSON({
      version: '1.0',
      metadata: {
        sources: [],
        domains: {
          orders: {
            description: 'Order management',
            systemType: 'domain',
          },
        },
      },
      components: [],
      links: [],
    })
  }
}

class FailingRepository extends RiviereQueryRepository {
  constructor(private readonly error: unknown) {
    super()
  }

  override load(): never {
    throw this.error
  }
}

describe('toQueryGraphLoadFailure', () => {
  it('returns graphNotFound failure when graph file is missing', () => {
    expect(toQueryGraphLoadFailure(new GraphNotFoundError('graph.json'))).toStrictEqual({
      kind: 'graphNotFound',
      message: 'Graph not found at graph.json',
    })
  })

  it('returns graphCorrupted failure when graph file cannot be parsed', () => {
    expect(toQueryGraphLoadFailure(new GraphCorruptedError('graph.json'))).toStrictEqual({
      kind: 'graphCorrupted',
      message: 'Graph file contains invalid JSON',
    })
  })

  it('returns undefined when error is not a graph loading failure', () => {
    expect(toQueryGraphLoadFailure(new UnexpectedQueryGraphLoadError())).toBeUndefined()
  })
})

describe('loadQueryGraph', () => {
  it('returns loaded query when repository loads graph', () => {
    const result = loadQueryGraph(new ReturningRepository(), undefined)
    expect(result.kind).toStrictEqual('loaded')
  })

  it('returns graph loading failure when repository throws known loading error', () => {
    expect(
      loadQueryGraph(new FailingRepository(new GraphNotFoundError('graph.json')), undefined),
    ).toStrictEqual({
      kind: 'graphNotFound',
      message: 'Graph not found at graph.json',
    })
  })

  it('rethrows unexpected repository errors', () => {
    expect(() =>
      loadQueryGraph(new FailingRepository(new UnexpectedQueryGraphLoadError()), undefined),
    ).toThrow(UnexpectedQueryGraphLoadError)
  })
})
