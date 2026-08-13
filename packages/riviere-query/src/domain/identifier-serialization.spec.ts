import { describe, expect, it } from 'vitest'
import { ComponentId } from './component-id'
import { LinkId } from './link-id'

describe('identifier serialization', () => {
  it('serializes a component ID to its value', () => {
    expect(JSON.stringify(ComponentId.parse('component-id'))).toBe('"component-id"')
  })

  it('serializes a link ID to its value', () => {
    expect(JSON.stringify(LinkId.parse('link-id'))).toBe('"link-id"')
  })
})
