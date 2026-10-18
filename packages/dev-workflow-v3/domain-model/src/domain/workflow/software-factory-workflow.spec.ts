import { describe, expect, it } from 'vitest'
import { SoftwareFactoryWorkflow } from './software-factory-workflow'

const workflow = SoftwareFactoryWorkflow.singleton()

describe('SoftwareFactoryWorkflow', () => {
  it('runs fourteen steps to reach a pull request ready for a person', () => {
    expect(workflow.startImplementation().id()).toBe('start-implementation')
    expect(workflow.startImplementation().steps()).toHaveLength(14)
  })

  it('loops over the review cycle once the pull request is open', () => {
    const steps = workflow
      .startImplementation()
      .steps()
      .map((step) => step.id())

    expect(workflow.startImplementation().loopedStep()?.id()).toBe('review-cycle')
    expect(steps.indexOf('review-cycle')).toBeGreaterThan(steps.indexOf('open-review-cycle'))
    expect(steps.indexOf('review-cycle')).toBeLessThan(steps.indexOf('mark-ready-for-human'))
  })

  it('runs eight steps in one review cycle', () => {
    expect(workflow.reviewCycle().id()).toBe('review-cycle')
    expect(workflow.reviewCycle().loopedStep()).toBeUndefined()
    expect(
      workflow
        .reviewCycle()
        .steps()
        .map((step) => step.id()),
    ).toStrictEqual([
      'architecture-review',
      'code-review',
      'bug-scanner',
      'collect-verdicts',
      'publish-review-findings',
      'wait-for-coderabbit',
      'address-feedback',
      'push-branch',
    ])
  })
})
