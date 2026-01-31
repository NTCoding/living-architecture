import {
  describe, it, expect 
} from 'vitest'
import { compareByCodePoint } from './compare-by-code-point'

describe('compareByCodePoint', () => {
  it('returns negative when first string sorts before second', () => {
    expect(compareByCodePoint('apple', 'banana')).toBe(-1)
  })

  it('returns positive when first string sorts after second', () => {
    expect(compareByCodePoint('banana', 'apple')).toBe(1)
  })

  it('returns zero when strings are equal', () => {
    expect(compareByCodePoint('same', 'same')).toBe(0)
  })
})
