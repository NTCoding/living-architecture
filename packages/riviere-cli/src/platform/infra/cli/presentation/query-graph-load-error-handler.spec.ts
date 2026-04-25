import {
  afterEach, beforeEach, describe, expect, it, vi 
} from 'vitest'
import {
  mkdtemp, rm 
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { CliErrorCode } from './error-codes'
import { handleQueryGraphLoadError } from './query-graph-load-error-handler'
import { GraphCorruptedError } from '../../../domain/graph-corrupted-error'
import { GraphNotFoundError } from '../../../domain/graph-not-found-error'

class ProcessExitSignal extends Error {
  constructor(exitCode: number) {
    super(`process.exit(${exitCode})`)
    this.name = 'ProcessExitSignal'
  }
}

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

interface TestContext {
  testDir: string
  originalCwd: string
  consoleOutput: string[]
}

function createTestContext(): TestContext {
  return {
    testDir: '',
    originalCwd: '',
    consoleOutput: [],
  }
}

function setupCommandTest(ctx: TestContext): void {
  beforeEach(async () => {
    ctx.testDir = await mkdtemp(join(tmpdir(), 'riviere-test-'))
    ctx.originalCwd = process.cwd()
    ctx.consoleOutput = []
    process.chdir(ctx.testDir)
    vi.spyOn(console, 'log').mockImplementation((message: string) => {
      ctx.consoleOutput.push(message)
    })
    vi.spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined) => {
      throw new ProcessExitSignal(typeof code === 'number' ? code : 0)
    })
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    if (ctx.originalCwd !== '') {
      process.chdir(ctx.originalCwd)
    }
    if (ctx.testDir !== '') {
      await rm(ctx.testDir, {
        recursive: true,
        force: true,
      })
    }
  })
}

function firstOutput(consoleOutput: string[]): unknown {
  const output = consoleOutput[0]
  if (output === undefined) {
    throw new TestAssertionError('Expected output')
  }

  return JSON.parse(output)
}

describe('handleQueryGraphLoadError', () => {
  const ctx: TestContext = createTestContext()
  setupCommandTest(ctx)

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
