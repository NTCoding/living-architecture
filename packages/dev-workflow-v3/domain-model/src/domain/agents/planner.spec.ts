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

  it('treats the issue as approved and asks for a todo list', () => {
    const brief = Planner.singleton().brief()

    expect(brief).toContain('Do not re-review the issue')
    expect(brief).toContain(
      'markdown is a numbered todo list, one todo per line, no prose paragraphs',
    )
  })
})
