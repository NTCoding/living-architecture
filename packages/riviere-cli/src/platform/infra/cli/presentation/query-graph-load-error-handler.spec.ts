import {
  describe, expect, it 
} from 'vitest'
import { CliErrorCode } from './error-codes'
import { handleQueryGraphLoadError } from './query-graph-load-error-handler'
import {
  createTestContext,
  setupCommandTest,
  TestAssertionError,
} from '../../../__fixtures__/command-test-fixtures'

class UnexpectedPresentationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UnexpectedPresentationError'
  }
}

function firstOutput(consoleOutput: string[]): unknown {
  const output = consoleOutput[0]
  if (output === undefined) {
    throw new TestAssertionError('Expected output')
  }

  return JSON.parse(output)
}

describe('handleQueryGraphLoadError', () => {
  const ctx = createTestContext()
  setupCommandTest(ctx)

  it('formats graph corrupted errors', () => {
    const handled = handleQueryGraphLoadError({
      code: 'GRAPH_CORRUPTED',
      graphPath: `${ctx.testDir}/graph.json`,
      kind: 'QUERY_GRAPH_LOAD_ERROR',
    })

    expect(handled).toBe(true)
    expect(firstOutput(ctx.consoleOutput)).toMatchObject({error: { code: CliErrorCode.GraphCorrupted },})
  })

  it('returns false for non-query errors', () => {
    expect(handleQueryGraphLoadError(new UnexpectedPresentationError('boom'))).toBe(false)
  })
})
