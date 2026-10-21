import { describe, expect, it } from 'vitest'
import { WorkflowPlan } from './workflow-plan'
import { InvalidWorkflowStep } from './workflow-step'
import type { WorkflowStep } from './workflow-step'

function namesIn(
  stage:
    | { readonly kind: 'one'; readonly step: WorkflowStep }
    | {
        readonly kind: 'together'
        readonly group: string
        readonly steps: readonly WorkflowStep[]
      },
): readonly string[] {
  return stage.kind === 'one' ? [stage.step.id()] : stage.steps.map((step) => step.id())
}

describe('WorkflowPlan', () => {
  it('keeps the steps in the order they were given', () => {
    const plan = WorkflowPlan.parse({
      id: 'review-cycle',
      steps: [{ id: 'code-review' }, { id: 'collect-verdicts' }],
    })

    expect(plan.id()).toBe('review-cycle')
    expect(plan.steps().map((step) => step.id())).toStrictEqual(['code-review', 'collect-verdicts'])
  })

  it('names the step that loops', () => {
    const plan = WorkflowPlan.parse({
      id: 'start-implementation',
      steps: [{ id: 'open-review-cycle' }, { id: 'review-cycle', looped: true }],
    })

    expect(plan.loopedStep()?.id()).toBe('review-cycle')
  })

  it('reports no loop when no step loops', () => {
    const plan = WorkflowPlan.parse({
      id: 'review-cycle',
      steps: [{ id: 'code-review' }],
    })

    expect(plan.loopedStep()).toBeUndefined()
  })

  it('gathers the steps of a group into one turn of the plan', () => {
    const plan = WorkflowPlan.parse({
      id: 'review-cycle',
      steps: [
        { id: 'architecture-review', group: 'reviews' },
        { id: 'code-review', group: 'reviews' },
        { id: 'collect-verdicts' },
      ],
    })

    expect(plan.stages().map((stage) => namesIn(stage))).toStrictEqual([
      ['architecture-review', 'code-review'],
      ['collect-verdicts'],
    ])
    expect(plan.stages().map((stage) => stage.kind)).toStrictEqual(['together', 'one'])
  })

  it('keeps two groups that follow one another apart', () => {
    const plan = WorkflowPlan.parse({
      id: 'review-cycle',
      steps: [
        { id: 'architecture-review', group: 'reviews' },
        { id: 'lint', group: 'checks' },
      ],
    })

    expect(plan.stages().map((stage) => namesIn(stage))).toStrictEqual([
      ['architecture-review'],
      ['lint'],
    ])
  })

  it('rejects a workflow with no steps', () => {
    expect(() => WorkflowPlan.parse({ id: 'review-cycle', steps: [] })).toThrow(
      'The workflow review-cycle has no steps.',
    )
  })

  it('rejects a step with no name', () => {
    expect(() => WorkflowPlan.parse({ id: 'review-cycle', steps: [{ id: '  ' }] })).toThrow(
      InvalidWorkflowStep,
    )
  })

  it('rejects the same step twice', () => {
    expect(() =>
      WorkflowPlan.parse({
        id: 'review-cycle',
        steps: [{ id: 'code-review' }, { id: 'code-review' }],
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

  it('rejects a group whose steps are split up', () => {
    expect(() =>
      WorkflowPlan.parse({
        id: 'review-cycle',
        steps: [
          { id: 'architecture-review', group: 'reviews' },
          { id: 'collect-verdicts' },
          { id: 'code-review', group: 'reviews' },
        ],
      }),
    ).toThrow('The workflow review-cycle splits up steps that run together: reviews.')
  })

  it('rejects a plan that starts with a step running once per item', () => {
    expect(() =>
      WorkflowPlan.parse({
        id: 'review-cycle',
        steps: [{ id: 'reply-to-review-comment', atOnce: 4 }],
      }),
    ).toThrow(
      'The workflow review-cycle starts with a step that runs once for every item, with no step before it to say what to run over.',
    )
  })

  it('reports a workflow with no name as a domain error', () => {
    expect(() => WorkflowPlan.parse({ id: '  ', steps: [{ id: 'a' }] })).toThrow(
      'A workflow needs a name:   ',
    )
  })
})
