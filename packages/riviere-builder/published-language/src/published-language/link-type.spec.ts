import { describe, expect, it } from 'vitest'
import { LinkType } from './link-type'

describe('LinkType', () => {
  it.each(['sync', 'async'])('parses %s', (value) => {
    const result = LinkType.parse(value)

    expect(result.success).toBe(true)
    expect(result.success && result.data.value).toBe(value)
  })

  it('returns the validation error for an unsupported link type', () => {
    const result = LinkType.parse('other')

    expect(result.success).toBe(false)
    expect(!result.success && result.error.issues).not.toHaveLength(0)
  })
})
