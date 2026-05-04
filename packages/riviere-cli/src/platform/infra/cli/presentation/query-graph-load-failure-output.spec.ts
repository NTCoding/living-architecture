import {
  describe, expect, it 
} from 'vitest'
import { CliErrorCode } from './error-codes'
import { formatQueryGraphLoadFailure } from './query-graph-load-failure-output'

describe('formatQueryGraphLoadFailure', () => {
  it('formats graphNotFound as GRAPH_NOT_FOUND', () => {
    expect(
      formatQueryGraphLoadFailure({
        kind: 'graphNotFound',
        message: 'Graph not found at graph.json',
      }),
    ).toStrictEqual({
      success: false,
      error: {
        code: CliErrorCode.GraphNotFound,
        message: 'Graph not found at graph.json',
        suggestions: [],
      },
    })
  })

  it('formats graphCorrupted as GRAPH_CORRUPTED', () => {
    expect(
      formatQueryGraphLoadFailure({
        kind: 'graphCorrupted',
        message: 'Graph file contains invalid JSON',
      }),
    ).toStrictEqual({
      success: false,
      error: {
        code: CliErrorCode.GraphCorrupted,
        message: 'Graph file contains invalid JSON',
        suggestions: [],
      },
    })
  })
})
