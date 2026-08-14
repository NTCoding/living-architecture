import { describe, expect, it } from 'vitest'
import { ComponentType } from './component-type'

describe('ComponentType', () => {
  it.each([
    ['UI', 'UI'],
    ['api', 'API'],
    ['usecase', 'UseCase'],
    ['DomainOp', 'DomainOp'],
    ['event', 'Event'],
    ['eventhandler', 'EventHandler'],
    ['custom', 'Custom'],
  ])('parses %s as %s', (value, expected) => {
    const result = ComponentType.parse(value)

    expect(result.success).toBe(true)
    expect(result.success && result.data.value).toBe(expected)
    expect(result.success && result.data.componentIdValue).toBe(expected.toLowerCase())
  })

  it('returns the validation error for an unsupported component type', () => {
    const result = ComponentType.parse('other')

    expect(result.success).toBe(false)
    expect(!result.success && result.error.issues).not.toHaveLength(0)
  })
})
