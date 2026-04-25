import {
  afterEach, beforeEach, describe, expect, it, vi 
} from 'vitest'
import {
  mkdtemp, rm 
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { handleGlobalError } from './global-error-handler'
import { GitError } from '../../external-clients/git/git-errors'
import { DraftComponentLoadError } from '../../external-clients/draft-components/draft-component-loader'
import { ConnectionDetectionError } from '@living-architecture/riviere-extract-ts'
import {
  CliErrorCode, ConfigValidationError, ExitCode 
} from './error-codes'

class TestAssertionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TestAssertionError'
  }
}

class UnexpectedGlobalError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UnexpectedGlobalError'
  }
}

class ProcessExitSignal extends Error {
  constructor(exitCode: number) {
    super(`process.exit(${exitCode})`)
    this.name = 'ProcessExitSignal'
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

function firstConsoleOutput(consoleOutput: string[]): unknown {
  const first = consoleOutput[0]
  if (first === undefined) {
    throw new TestAssertionError('Expected console output but got empty array')
  }
  return JSON.parse(first)
}

describe('handleGlobalError', () => {
  const ctx: TestContext = createTestContext()
  setupCommandTest(ctx)

  it('formats GitError with runtime exit code', () => {
    const error = new GitError('NOT_A_REPOSITORY', 'Not a git repo')

    expect(() => handleGlobalError(error)).toThrow('process.exit')

    const output = firstConsoleOutput(ctx.consoleOutput)
    expect(output).toMatchObject({ error: { code: CliErrorCode.GitNotARepository } })
    expect(process.exit).toHaveBeenCalledWith(ExitCode.RuntimeError)
  })

  it('formats DraftComponentLoadError with runtime exit code', () => {
    const error = new DraftComponentLoadError('Invalid draft components')

    expect(() => handleGlobalError(error)).toThrow('process.exit')

    const output = firstConsoleOutput(ctx.consoleOutput)
    expect(output).toMatchObject({ error: { code: CliErrorCode.ValidationError } })
    expect(process.exit).toHaveBeenCalledWith(ExitCode.RuntimeError)
  })

  it('formats ConnectionDetectionError with extraction failure exit code', () => {
    const error = new ConnectionDetectionError({
      file: 'src/handler.ts',
      line: 42,
      typeName: 'OrderService',
      reason: 'Could not resolve type',
    })

    expect(() => handleGlobalError(error)).toThrow('process.exit')

    const output = firstConsoleOutput(ctx.consoleOutput)
    expect(output).toMatchObject({
      error: {
        code: CliErrorCode.ConnectionDetectionFailure,
        suggestions: ['Use --allow-incomplete to emit uncertain links instead of failing'],
      },
    })
    expect(process.exit).toHaveBeenCalledWith(ExitCode.ExtractionFailure)
  })

  it('formats GitError with GIT_NOT_FOUND code', () => {
    const gitError = new GitError('GIT_NOT_FOUND', 'git binary not found')

    expect(() => handleGlobalError(gitError)).toThrow('process.exit')

    const output = firstConsoleOutput(ctx.consoleOutput)
    expect(output).toMatchObject({ error: { code: CliErrorCode.GitNotFound } })
    expect(process.exit).toHaveBeenCalledWith(ExitCode.RuntimeError)
  })

  it('formats unknown GitError codes as validation errors', () => {
    const gitError = new GitError('NO_REMOTE', 'remote missing')

    expect(() => handleGlobalError(gitError)).toThrow('process.exit')

    const output = firstConsoleOutput(ctx.consoleOutput)
    expect(output).toMatchObject({ error: { code: CliErrorCode.ValidationError } })
    expect(process.exit).toHaveBeenCalledWith(ExitCode.RuntimeError)
  })

  it('formats ConfigValidationError with config validation exit code', () => {
    const error = new ConfigValidationError(CliErrorCode.ConfigNotFound, 'Config file not found')

    expect(() => handleGlobalError(error)).toThrow('process.exit')

    const output = firstConsoleOutput(ctx.consoleOutput)
    expect(output).toMatchObject({ error: { code: CliErrorCode.ConfigNotFound } })
    expect(process.exit).toHaveBeenCalledWith(ExitCode.ConfigValidation)
  })

  it('formats GitError with NOT_A_REPOSITORY code', () => {
    const gitError = new GitError('NOT_A_REPOSITORY', 'Not a git repository')

    expect(() => handleGlobalError(gitError)).toThrow('process.exit')

    const output = firstConsoleOutput(ctx.consoleOutput)
    expect(output).toMatchObject({ error: { code: CliErrorCode.GitNotARepository } })
    expect(process.exit).toHaveBeenCalledWith(ExitCode.RuntimeError)
  })

  it('formats ConfigValidationError for missing files as validation error', () => {
    const error = new ConfigValidationError(
      CliErrorCode.ValidationError,
      'Files not found: missing.ts',
    )

    expect(() => handleGlobalError(error)).toThrow('process.exit')

    const output = firstConsoleOutput(ctx.consoleOutput)
    expect(output).toMatchObject({ error: { code: CliErrorCode.ValidationError } })
    expect(process.exit).toHaveBeenCalledWith(ExitCode.ConfigValidation)
  })

  it('re-throws unknown errors', () => {
    const error = new UnexpectedGlobalError('unexpected')

    expect(() => handleGlobalError(error)).toThrow('unexpected')
  })
})
