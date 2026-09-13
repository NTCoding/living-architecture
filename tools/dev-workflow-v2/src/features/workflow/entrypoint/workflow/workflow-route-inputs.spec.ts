import { describe, expect, it } from 'vitest'
import {
  parseNumberArgument,
  parseOptionalStringArgument,
  parseStringArgument,
  parseStringArguments,
} from './workflow-route-inputs'

describe('workflow route input boundary', () => {
  it('accepts numeric and string route arguments', () => {
    expect(parseNumberArgument(1)).toBe(1)
    expect(parseStringArgument('branch')).toBe('branch')
  })

  it('accepts optional and rest route arguments', () => {
    expect(parseOptionalStringArgument(undefined)).toBeUndefined()
    expect(parseOptionalStringArgument('url')).toBe('url')
    expect(parseStringArguments(['one', 'two'])).toStrictEqual(['one', 'two'])
  })

  it('rejects invalid numeric, string, and optional arguments', () => {
    expect(() => parseNumberArgument('one')).toThrow('Expected parsed number')
    expect(() => parseStringArgument(1)).toThrow('Expected parsed string')
    expect(() => parseOptionalStringArgument(1)).toThrow('Expected parsed optional string')
  })

  it('rejects invalid rest arguments', () => {
    expect(() => parseStringArguments('one')).toThrow('Expected parsed string arguments')
    expect(() => parseStringArguments(['one', 2])).toThrow('Expected parsed string arguments')
  })
})
