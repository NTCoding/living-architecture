import { describe, expect, it } from 'vitest'
import { HttpMethod } from './http-method'

describe('HttpMethod', () => {
  it.each(['GET', 'post', 'Put', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'])('parses %s', (value) => {
    const result = HttpMethod.parse(value)

    expect(result.success).toBe(true)
    expect(result.success && result.data.value).toBe(value.toUpperCase())
  })

  it('returns the validation error for an unsupported HTTP method', () => {
    const result = HttpMethod.parse('TRACE')

    expect(result.success).toBe(false)
    expect(!result.success && result.error.issues).not.toHaveLength(0)
  })
})
