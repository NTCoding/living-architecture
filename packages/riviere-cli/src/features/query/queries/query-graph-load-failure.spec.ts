import { describe, expect, it } from 'vitest'
import { GraphCorruptedError } from '../../../platform/domain/graph-corrupted-error'
import { GraphNotFoundError } from '../../../platform/domain/graph-not-found-error'
import { toQueryGraphLoadFailure } from './query-graph-load-failure'

class UnexpectedQueryGraphLoadError extends Error {
  constructor() {
    super('boom')
    this.name = 'UnexpectedQueryGraphLoadError'
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
