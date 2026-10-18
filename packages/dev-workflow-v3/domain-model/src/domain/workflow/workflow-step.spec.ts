import { describe, expect, it } from 'vitest'
import { InvalidWorkflowStep, WorkflowStep } from './workflow-step'

describe('WorkflowStep', () => {
  it('names the step and says whether it loops', () => {
    const step = WorkflowStep.parse({ id: 'review-cycle', looped: true })

    expect(step.id()).toBe('review-cycle')
    expect(step.isLooped()).toBe(true)
  })

  it('keeps a step that does not loop', () => {
    const step = WorkflowStep.parse({ id: 'verify', looped: false })

    expect(step.isLooped()).toBe(false)
  })

  it('rejects a step with a blank name', () => {
    expect(() => WorkflowStep.parse({ id: '   ', looped: false })).toThrow(InvalidWorkflowStep)
  })
})
