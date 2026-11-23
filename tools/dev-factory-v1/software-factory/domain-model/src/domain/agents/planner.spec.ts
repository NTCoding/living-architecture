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

  it('treats the issue as approved and asks for one todo item per unit of work', () => {
    const brief = Planner.singleton().brief()

    expect(brief).toContain('Do not re-review the issue')
    expect(brief).toContain(
      'one item per unit of work, each small enough to finish and verify on its own',
    )
  })

  it('asks for items with a short name and a full description', () => {
    const brief = Planner.singleton().brief()

    expect(brief).toContain(
      'each item has a short name, the section title describing the todo, and a description',
    )
    expect(brief).toContain('"items"')
  })
})
