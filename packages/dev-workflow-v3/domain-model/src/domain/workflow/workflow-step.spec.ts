import { describe, expect, it } from 'vitest'
import { InvalidWorkflowStep, WorkflowStep } from './workflow-step'

describe('WorkflowStep', () => {
  it('names the step and says whether it loops', () => {
    const step = WorkflowStep.parse({ id: 'review-cycle', looped: true })

    expect(step.id()).toBe('review-cycle')
    expect(step.isLooped()).toBe(true)
  })

  it('keeps a step that takes its turn on its own', () => {
    const step = WorkflowStep.parse({ id: 'verify' })

    expect(step.isLooped()).toBe(false)
    expect(step.isChosen()).toBe(false)
    expect(step.group()).toBeNull()
    expect(step.atOnce()).toBeNull()
  })

  it('names the group of a step that takes its turn with others', () => {
    const step = WorkflowStep.parse({ id: 'code-review', group: 'reviews', chosen: true })

    expect(step.group()).toBe('reviews')
    expect(step.isChosen()).toBe(true)
    expect(step.atOnce()).toBeNull()
  })

  it('says how many items a step that runs once per item takes at a time', () => {
    const step = WorkflowStep.parse({ id: 'reply-to-review-comment', atOnce: 4 })

    expect(step.atOnce()).toBe(4)
    expect(step.group()).toBeNull()
  })

  it('rejects a step with a blank name', () => {
    expect(() => WorkflowStep.parse({ id: '   ' })).toThrow(InvalidWorkflowStep)
  })

  it('rejects a step that tries to take two turns at once', () => {
    expect(() => WorkflowStep.parse({ id: 'code-review', looped: true, group: 'reviews' })).toThrow(
      'The step code-review takes no turn a plan can run.',
    )
  })
})
