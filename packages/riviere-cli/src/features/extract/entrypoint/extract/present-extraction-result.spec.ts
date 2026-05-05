import {
  describe, expect, it, vi 
} from 'vitest'
import { presentExtractionResult } from './present-extraction-result'

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
})
