import { describe, expect, it } from 'vitest'
import { Implementer } from './implementer'

describe('Implementer', () => {
  it('is the implementer agent', () => {
    expect(Implementer.singleton().name()).toBe('implementer')
  })

  it('carries the implementer brief', () => {
    expect(Implementer.singleton().brief()).toContain(
      'You are the implementer in a software factory workflow.',
    )
  })
})
