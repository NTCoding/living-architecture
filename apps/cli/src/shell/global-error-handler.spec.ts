import { describe, it, expect } from 'vitest'
import { handleGlobalError } from './global-error-handler'
import {
  CliErrorCode,
  ConfigValidationError,
  ExitCode,
} from '../infra/cli/presentation/error-codes'
import {
  TestAssertionError,
  createTestContext,
  setupCommandTest,
} from '../__fixtures__/command-test-fixtures'
import type { TestContext } from '../__fixtures__/command-test-fixtures'

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

  it('formats ConfigValidationError with config validation exit code', () => {
    const error = new ConfigValidationError(CliErrorCode.ConfigNotFound, 'Config file not found')

    expect(() => handleGlobalError(error)).toThrow('process.exit')

    const output = firstConsoleOutput(ctx.consoleOutput)
    expect(output).toMatchObject({ error: { code: CliErrorCode.ConfigNotFound } })
    expect(process.exit).toHaveBeenCalledWith(ExitCode.ConfigValidation)
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
