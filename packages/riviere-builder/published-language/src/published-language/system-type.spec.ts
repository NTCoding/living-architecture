import { describe, expect, it } from 'vitest'
import { SystemType } from './system-type'

describe('SystemType', () => {
  it.each(['domain', 'bff', 'ui', 'external-service', 'other'])('parses %s', (value) => {
    const result = SystemType.parse(value)

    expect(result.success).toBe(true)
    expect(result.success && result.data.value).toBe(value)
  })

  it('returns the validation error for an unsupported system type', () => {
    const result = SystemType.parse('backend')

    expect(result.success).toBe(false)
    expect(!result.success && result.error.issues).not.toHaveLength(0)
  })
})
