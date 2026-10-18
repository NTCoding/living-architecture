import { afterEach, describe, expect, it, vi } from 'vitest'
import { CliErrorCode, ExitCode } from './error-codes'
import { formatError, formatSuccess } from './output'
import { writeCliOutput } from './output-writer'

describe('writeCliOutput', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    process.exitCode = undefined
  })

  it('writes successful output to standard output', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)

    writeCliOutput(formatSuccess('Workflow is valid'))

    expect(log).toHaveBeenCalledWith('{"success":true,"data":"Workflow is valid","warnings":[]}')
    expect(process.exitCode).toBeUndefined()
  })

  it('writes failed output to standard error and marks the process failed', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    writeCliOutput(formatError(CliErrorCode.AiCliUnavailable, 'AI CLI is unavailable'))

    expect(error).toHaveBeenCalledWith(
      '{"success":false,"error":{"code":"AI_CLI_UNAVAILABLE","message":"AI CLI is unavailable","suggestions":[]}}',
    )
    expect(process.exitCode).toBe(ExitCode.RuntimeError)
  })
})
