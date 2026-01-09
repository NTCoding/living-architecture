import {
  describe, expect, it 
} from 'vitest'
import {
  assertDefined, assertHTMLInputElement 
} from './test-assertions'

describe('assertDefined', () => {
  it('returns the value when defined', () => {
    expect(assertDefined('hello')).toBe('hello')
    expect(assertDefined(0)).toBe(0)
    expect(assertDefined(false)).toBe(false)
    expect(assertDefined('')).toBe('')
  })

  it('throws when value is undefined', () => {
    expect(() => assertDefined(undefined)).toThrow('Expected value to be defined')
  })

  it('throws when value is null', () => {
    expect(() => assertDefined(null)).toThrow('Expected value to be defined')
  })

  it('throws with custom message', () => {
    expect(() => assertDefined(undefined, 'Custom error')).toThrow('Custom error')
  })
})

describe('assertHTMLInputElement', () => {
  it('returns the element when it is an HTMLInputElement', () => {
    const input = document.createElement('input')
    expect(assertHTMLInputElement(input)).toBe(input)
  })

  it('throws when element is null', () => {
    expect(() => assertHTMLInputElement(null)).toThrow('Expected HTMLInputElement')
  })

  it('throws when element is not an HTMLInputElement', () => {
    const div = document.createElement('div')
    expect(() => assertHTMLInputElement(div)).toThrow('Expected HTMLInputElement')
  })

  it('throws with custom message', () => {
    expect(() => assertHTMLInputElement(null, 'Custom message')).toThrow('Custom message')
  })
})
