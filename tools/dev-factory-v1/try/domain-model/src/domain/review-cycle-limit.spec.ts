import { describe, expect, it } from 'vitest'
import { ReviewCycleLimit } from './review-cycle-limit'

describe('ReviewCycleLimit', () => {
  it('is not reached before the standard maximum', () => {
    expect(ReviewCycleLimit.singleton().isReached(2)).toBe(false)
  })

  it('is reached at the standard maximum', () => {
    expect(ReviewCycleLimit.singleton().isReached(3)).toBe(true)
  })

  it('is reached beyond the standard maximum', () => {
    expect(ReviewCycleLimit.singleton().isReached(4)).toBe(true)
  })

  it('parses an explicit maximum', () => {
    expect(ReviewCycleLimit.parse(5).isReached(4)).toBe(false)
    expect(ReviewCycleLimit.parse(5).isReached(5)).toBe(true)
  })

  it('rejects a maximum that is not a positive integer', () => {
    expect(() => ReviewCycleLimit.parse(0)).toThrow('Number must be greater than 0')
    expect(() => ReviewCycleLimit.parse(1.5)).toThrow('Expected integer, received float')
  })
})
