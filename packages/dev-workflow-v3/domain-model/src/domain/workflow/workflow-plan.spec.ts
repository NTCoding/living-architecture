import { describe, expect, it } from 'vitest'
import { WorkflowPlan } from './workflow-plan'
import { InvalidWorkflowStep } from './workflow-step'

describe('WorkflowPlan', () => {
  it('keeps the steps in the order they were given', () => {
    const plan = WorkflowPlan.parse({
      id: 'review-cycle',
      steps: [
        { id: 'code-review', looped: false },
        { id: 'collect-verdicts', looped: false },
      ],
    })

    expect(plan.id()).toBe('review-cycle')
    expect(plan.steps().map((step) => step.id())).toStrictEqual(['code-review', 'collect-verdicts'])
  })

  it('names the step that loops', () => {
    const plan = WorkflowPlan.parse({
      id: 'start-implementation',
      steps: [
        { id: 'open-review-cycle', looped: false },
        { id: 'review-cycle', looped: true },
      ],
    })

    expect(plan.loopedStep()?.id()).toBe('review-cycle')
  })

  it('reports no loop when no step loops', () => {
    const plan = WorkflowPlan.parse({
      id: 'review-cycle',
      steps: [{ id: 'code-review', looped: false }],
    })

    expect(plan.loopedStep()).toBeUndefined()
  })

  it('rejects a workflow with no steps', () => {
    expect(() => WorkflowPlan.parse({ id: 'review-cycle', steps: [] })).toThrow(
      'The workflow review-cycle has no steps.',
    )
  })

  it('rejects a step with no name', () => {
    expect(() =>
      WorkflowPlan.parse({ id: 'review-cycle', steps: [{ id: '  ', looped: false }] }),
    ).toThrow(InvalidWorkflowStep)
  })

  it('rejects the same step twice', () => {
    expect(() =>
      WorkflowPlan.parse({
        id: 'review-cycle',
        steps: [
          { id: 'code-review', looped: false },
          { id: 'code-review', looped: false },
        ],
      }),
    ).toThrow('The workflow review-cycle names a step twice: code-review.')
  })

  it('rejects two loops', () => {
    expect(() =>
      WorkflowPlan.parse({
        id: 'review-cycle',
        steps: [
          { id: 'code-review', looped: true },
          { id: 'collect-verdicts', looped: true },
        ],
      }),
    ).toThrow(
      'The workflow review-cycle loops over more than one step: code-review, collect-verdicts.',
    )
  })

  it('reports a workflow with no name as a domain error', () => {
    expect(() => WorkflowPlan.parse({ id: '  ', steps: [{ id: 'a', looped: false }] })).toThrow(
      'A workflow needs a name:   ',
    )
  })
})
