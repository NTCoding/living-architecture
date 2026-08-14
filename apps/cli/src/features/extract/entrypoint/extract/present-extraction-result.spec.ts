import { describe, expect, it, vi } from 'vitest'
import { dataAccessCliErrorCode, presentExtractionResult } from './present-extraction-result'
import { CliErrorCode } from '../../../../infra/cli/presentation/error-codes'

describe('dataAccessCliErrorCode', () => {
  it('maps GIT_NOT_FOUND to the CLI git-not-found code', () => {
    expect(dataAccessCliErrorCode('GIT_NOT_FOUND')).toBe(CliErrorCode.GitNotFound)
  })

  it('maps other data-access failures to validation errors', () => {
    expect(dataAccessCliErrorCode('FILE_READ_ERROR')).toBe(CliErrorCode.ValidationError)
  })
})

describe('presentExtractionResult', () => {
  it('returns early for fieldFailure results', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    presentExtractionResult(
      {
        failedFields: ['name'],
        kind: 'fieldFailure',
      },
      {},
    )

    expect(logSpy).not.toHaveBeenCalled()
    expect(errorSpy).not.toHaveBeenCalled()

    logSpy.mockRestore()
    errorSpy.mockRestore()
  })

  it('returns early for configFailure results', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    presentExtractionResult(
      {
        code: 'VALIDATION_ERROR',
        kind: 'configFailure',
        message: 'Invalid config',
      },
      {},
    )

    expect(logSpy).not.toHaveBeenCalled()
    expect(errorSpy).not.toHaveBeenCalled()

    logSpy.mockRestore()
    errorSpy.mockRestore()
  })

  it('returns early for connectionDetectionFailure results', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    presentExtractionResult(
      {
        kind: 'connectionDetectionFailure',
        message: 'Could not resolve type',
      },
      {},
    )

    expect(logSpy).not.toHaveBeenCalled()
    expect(errorSpy).not.toHaveBeenCalled()

    logSpy.mockRestore()
    errorSpy.mockRestore()
  })
})
