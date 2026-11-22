import { describe, expect, it } from 'vitest'
import { ImplementationPlan } from './implementation-plan'

describe('ImplementationPlan', () => {
  it('keeps the plan markdown', () => {
    expect(ImplementationPlan.parse('1. Add the value object.').markdown()).toBe(
      '1. Add the value object.',
    )
  })

  it('rejects an empty plan', () => {
    expect(() => ImplementationPlan.parse('  ')).toThrow(
      'String must contain at least 1 character(s)',
    )
  })
})
