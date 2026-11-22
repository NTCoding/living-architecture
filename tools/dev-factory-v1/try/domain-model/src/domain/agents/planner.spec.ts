import { describe, expect, it } from 'vitest'
import { Planner } from './planner'

describe('Planner', () => {
  it('is the planner agent', () => {
    expect(Planner.singleton().name()).toBe('planner')
  })

  it('carries the planner brief', () => {
    expect(Planner.singleton().brief()).toContain(
      'You are the planner in a software factory workflow.',
    )
  })
})
