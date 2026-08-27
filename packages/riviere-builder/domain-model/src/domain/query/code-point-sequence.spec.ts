import { describe, expect, it } from 'vitest'
import { CodePointSequence } from './code-point-sequence'

function positionOf(left: string, right: string) {
  return CodePointSequence.parse(left).positionRelativeTo(CodePointSequence.parse(right))
}

describe('CodePointSequence', () => {
  it('positions the first string before the second', () => {
    expect(positionOf('apple', 'banana').value).toBe('before')
  })

  it('positions the first string after the second', () => {
    expect(positionOf('banana', 'apple').value).toBe('after')
  })

  it('recognises the same sequence', () => {
    expect(positionOf('same', 'same').value).toBe('same')
  })

  it('orders Unicode scalar values instead of UTF-16 code units', () => {
    expect(positionOf('\uFFFF', '\u{10000}').value).toBe('before')
    expect(positionOf('\u{10000}', '\uFFFF').value).toBe('after')
  })

  it('positions a shorter prefix before a longer string', () => {
    expect(positionOf('same', 'same-value').value).toBe('before')
  })

  it('positions a longer string after its prefix', () => {
    expect(positionOf('same-value', 'same').value).toBe('after')
  })
})

describe('RelativePosition', () => {
  it.each([
    ['apple', 'banana', -1],
    ['same', 'same', 0],
    ['banana', 'apple', 1],
  ] as const)(
    'converts the position of %s relative to %s to the ascending Array.sort result %s',
    (left, right, result) => {
      expect(positionOf(left, right).asAscendingArraySortResult()).toBe(result)
    },
  )
})
