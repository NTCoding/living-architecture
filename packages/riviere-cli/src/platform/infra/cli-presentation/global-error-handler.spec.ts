import {
  describe, it, expect 
} from 'vitest'
import { handleGlobalError } from './global-error-handler'
import { GitError } from '../git/git-errors'
import { DraftComponentLoadError } from '../extraction-config/draft-component-loader'
import { ConnectionDetectionError } from '@living-architecture/riviere-extract-ts'
import {
  CliErrorCode,
  ConfigValidationError,
  ExitCode,
  ExtractionFieldFailureError,
} from './error-codes'
import { SourceFilterError } from '../source-filtering/filter-source-files'
import {
  TestAssertionError,
  createTestContext,
  setupCommandTest,
} from '../../__fixtures__/command-test-fixtures'
import type { TestContext } from '../../__fixtures__/command-test-fixtures'

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
    expect(output).toMatchObject({ error: { code: CliErrorCode.ValidationError } })
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

  it('formats SourceFilterError with GIT_NOT_FOUND code', () => {
    const gitError = new GitError('GIT_NOT_FOUND', 'git binary not found')
    const error = new SourceFilterError('GIT_ERROR', 'Git error', gitError)

    expect(() => handleGlobalError(error)).toThrow('process.exit')

    const output = firstConsoleOutput(ctx.consoleOutput)
    expect(output).toMatchObject({ error: { code: CliErrorCode.GitNotFound } })
    expect(process.exit).toHaveBeenCalledWith(ExitCode.RuntimeError)
  })

  it('formats ConfigValidationError with config validation exit code', () => {
    const error = new ConfigValidationError(CliErrorCode.ConfigNotFound, 'Config file not found')

    expect(() => handleGlobalError(error)).toThrow('process.exit')

    const output = firstConsoleOutput(ctx.consoleOutput)
    expect(output).toMatchObject({ error: { code: CliErrorCode.ConfigNotFound } })
    expect(process.exit).toHaveBeenCalledWith(ExitCode.ConfigValidation)
  })

  it('formats ExtractionFieldFailureError with extraction failure exit code', () => {
    const error = new ExtractionFieldFailureError(['eventName', 'targetType'])

    expect(() => handleGlobalError(error)).toThrow('process.exit')

    const output = firstConsoleOutput(ctx.consoleOutput)
    expect(output).toMatchObject({ error: { code: CliErrorCode.ValidationError } })
    expect(process.exit).toHaveBeenCalledWith(ExitCode.ExtractionFailure)
  })

  it('formats SourceFilterError with NOT_A_REPOSITORY code', () => {
    const gitError = new GitError('NOT_A_REPOSITORY', 'Not a git repository')
    const error = new SourceFilterError('GIT_ERROR', 'Git error', gitError)

    expect(() => handleGlobalError(error)).toThrow('process.exit')

    const output = firstConsoleOutput(ctx.consoleOutput)
    expect(output).toMatchObject({ error: { code: CliErrorCode.GitNotARepository } })
    expect(process.exit).toHaveBeenCalledWith(ExitCode.RuntimeError)
  })

  it('formats SourceFilterError without git cause as validation error', () => {
    const error = new SourceFilterError('FILES_NOT_FOUND', 'No files matched')

    expect(() => handleGlobalError(error)).toThrow('process.exit')

    const output = firstConsoleOutput(ctx.consoleOutput)
    expect(output).toMatchObject({ error: { code: CliErrorCode.ValidationError } })
    expect(process.exit).toHaveBeenCalledWith(ExitCode.ConfigValidation)
  })

  it('re-throws unknown errors', () => {
    const error = new TestAssertionError('unexpected')

    expect(() => handleGlobalError(error)).toThrow('unexpected')
  })
})
