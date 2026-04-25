import {
  afterEach, beforeEach, describe, expect, it, vi 
} from 'vitest'
import { CliErrorCode } from './error-codes'
import { handleQueryGraphLoadError } from './query-graph-load-error-handler'
import { GraphCorruptedError } from '../../../domain/graph-corrupted-error'
import { GraphNotFoundError } from '../../../domain/graph-not-found-error'

class TestAssertionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TestAssertionError'
  }
}

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

interface TestContext {consoleOutput: string[]}

describe('handleQueryGraphLoadError', () => {
  const ctx: TestContext = { consoleOutput: [] }

  beforeEach(() => {
    ctx.consoleOutput = []
    vi.spyOn(console, 'log').mockImplementation((message: string) => {
      ctx.consoleOutput.push(message)
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('formats graph corrupted errors', () => {
    const handled = handleQueryGraphLoadError(new GraphCorruptedError('/path/to/graph.json'))

    expect(handled).toBe(true)
    expect(firstOutput(ctx.consoleOutput)).toMatchObject({error: { code: CliErrorCode.GraphCorrupted },})
  })

  it('formats graph not found errors', () => {
    const handled = handleQueryGraphLoadError(new GraphNotFoundError('/path/to/graph.json'))

    expect(handled).toBe(true)
    expect(firstOutput(ctx.consoleOutput)).toMatchObject({error: { code: CliErrorCode.GraphNotFound },})
  })

  it('returns false for non-query errors', () => {
    expect(handleQueryGraphLoadError(new UnexpectedPresentationError('boom'))).toBe(false)
  })
})
