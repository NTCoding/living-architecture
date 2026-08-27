import { describe, expect, it } from 'vitest'
import { ExtractionError } from './literal-detection'

describe('ExtractionError.messageFrom', () => {
  it('reads the message from an error', () => {
    expect(ExtractionError.messageFrom(new ExtractionError('Failed', 'source.ts', 4))).toBe(
      'Failed at source.ts:4',
    )
  })

  it('describes a failure that is not an error instance', () => {
    expect(ExtractionError.messageFrom('Failed without an error')).toBe('Failed without an error')
  })
})
