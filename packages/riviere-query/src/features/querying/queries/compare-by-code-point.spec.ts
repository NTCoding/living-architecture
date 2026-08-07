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

  it('orders Unicode scalar values instead of UTF-16 code units', () => {
    expect(compareByCodePoint('\uFFFF', '\u{10000}')).toBe(-1)
    expect(compareByCodePoint('\u{10000}', '\uFFFF')).toBe(1)
  })

  it('orders a shorter prefix before a longer string', () => {
    expect(compareByCodePoint('same', 'same-value')).toBe(-1)
  })

  it('orders a longer string after its prefix', () => {
    expect(compareByCodePoint('same-value', 'same')).toBe(1)
  })
})
