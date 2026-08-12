import { applyEvent, EMPTY_STATE } from './fold'
import type { WorkflowEvent } from './workflow-events'
import type { WorkflowState } from './workflow-types'

const AT = '2026-01-01T00:00:00Z'

function makeState(overrides: Partial<WorkflowState>): WorkflowState {
  return EMPTY_STATE.with(overrides)
}

describe('applyEvent — review-recorded', () => {
  it('sets taskCheckPassed to true when task-check passed', () => {
    const event: WorkflowEvent = {
      type: 'review-recorded',
      at: AT,
      reviewId: 1,
      reviewType: 'task-check',
      verdict: 'PASS',
    }

    const result = applyEvent(EMPTY_STATE, event)

    expect(result.taskCheckPassed).toStrictEqual(true)
  })

  it('sets taskCheckPassed to false when latest task-check failed', () => {
    const event: WorkflowEvent = {
      type: 'review-recorded',
      at: AT,
      reviewId: 2,
      reviewType: 'task-check',
      verdict: 'FAIL',
    }

    const result = applyEvent(makeState({ taskCheckPassed: true }), event)

    expect(result.taskCheckPassed).toStrictEqual(false)
  })

  it('sets architecture review flag from recorded review verdict', () => {
    const event: WorkflowEvent = {
      type: 'review-recorded',
      at: AT,
      reviewId: 3,
      reviewType: 'architecture-review',
      verdict: 'PASS',
    }

    const result = applyEvent(EMPTY_STATE, event)

    expect(result.architectureReviewPassed).toStrictEqual(true)
  })

  it('sets code review flag from recorded review verdict', () => {
    const event: WorkflowEvent = {
      type: 'review-recorded',
      at: AT,
      reviewId: 4,
      reviewType: 'code-review',
      verdict: 'PASS',
    }

    const result = applyEvent(EMPTY_STATE, event)

    expect(result.codeReviewPassed).toStrictEqual(true)
  })

  it('sets code review flag to false when latest code review failed', () => {
    const event: WorkflowEvent = {
      type: 'review-recorded',
      at: AT,
      reviewId: 5,
      reviewType: 'code-review',
      verdict: 'FAIL',
    }

    const result = applyEvent(makeState({ codeReviewPassed: true }), event)

    expect(result.codeReviewPassed).toStrictEqual(false)
  })

  it('sets bug scanner flag from recorded review verdict', () => {
    const event: WorkflowEvent = {
      type: 'review-recorded',
      at: AT,
      reviewId: 6,
      reviewType: 'bug-scanner',
      verdict: 'PASS',
    }

    const result = applyEvent(EMPTY_STATE, event)

    expect(result.bugScannerPassed).toStrictEqual(true)
  })

  it('sets bug scanner flag to false when latest bug scanner failed', () => {
    const event: WorkflowEvent = {
      type: 'review-recorded',
      at: AT,
      reviewId: 7,
      reviewType: 'bug-scanner',
      verdict: 'FAIL',
    }

    const result = applyEvent(makeState({ bugScannerPassed: true }), event)

    expect(result.bugScannerPassed).toStrictEqual(false)
  })

  it('ignores review types not owned by the workflow', () => {
    const event: WorkflowEvent = {
      type: 'review-recorded',
      at: AT,
      reviewId: 8,
      reviewType: 'external-review',
      verdict: 'PASS',
    }

    const result = applyEvent(EMPTY_STATE, event)

    expect(result).toStrictEqual(EMPTY_STATE)
  })
})
