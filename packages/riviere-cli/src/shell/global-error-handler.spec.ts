import { describe, it, expect } from 'vitest'
import { handleGlobalError } from './global-error-handler'
import { GitError } from '../platform/infra/external-clients/git/git-errors'
import { FileReadError } from '../platform/infra/external-clients/filesystem/file-reader'
import {
  CliErrorCode,
  ConfigValidationError,
  ExitCode,
} from '../platform/infra/cli/presentation/error-codes'
import {
  TestAssertionError,
  createTestContext,
  setupCommandTest,
} from '../platform/__fixtures__/command-test-fixtures'
import type { TestContext } from '../platform/__fixtures__/command-test-fixtures'

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

  it('formats FileReadError with runtime exit code', () => {
    const error = new FileReadError('Invalid draft components')

    expect(() => handleGlobalError(error)).toThrow('process.exit')

    const output = firstConsoleOutput(ctx.consoleOutput)
    expect(output).toMatchObject({ error: { code: CliErrorCode.ValidationError } })
    expect(process.exit).toHaveBeenCalledWith(ExitCode.RuntimeError)
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
    const error = new TestAssertionError('unexpected')

    expect(() => handleGlobalError(error)).toThrow('unexpected')
  })
})
