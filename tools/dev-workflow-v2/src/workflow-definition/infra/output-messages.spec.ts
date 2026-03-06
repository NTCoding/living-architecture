import {
  getOperationBody, getTransitionTitle 
} from './output-messages'
import { INITIAL_STATE } from '../domain/workflow-types'
import type { WorkflowState } from '../domain/workflow-types'

function makeState(overrides?: Partial<WorkflowState>): WorkflowState {
  return {
    ...INITIAL_STATE,
    ...overrides,
  }
}

describe('getOperationBody', () => {
  it('returns issue number for record-issue', () => {
    const body = getOperationBody('record-issue', makeState({ githubIssue: 42 }))
    expect(body).toContain('#42')
  })

  it('throws when record-issue called without issue', () => {
    expect(() => getOperationBody('record-issue', makeState())).toThrow(
      "Expected 'githubIssue' to be set",
    )
  })

  it('returns branch name for record-branch', () => {
    const body = getOperationBody('record-branch', makeState({ featureBranch: 'feature/x' }))
    expect(body).toContain('feature/x')
  })

  it('throws when record-branch called without branch', () => {
    expect(() => getOperationBody('record-branch', makeState())).toThrow(
      "Expected 'featureBranch' to be set",
    )
  })

  it('returns verify passed message with transition hint', () => {
    const body = getOperationBody('record-verify-passed', makeState())
    expect(body).toContain('Verify passed')
    expect(body).toContain('REVIEWING')
  })

  it('returns verify failed message with transition hint', () => {
    const body = getOperationBody('record-verify-failed', makeState())
    expect(body).toContain('Verify failed')
    expect(body).toContain('IMPLEMENTING')
  })

  it('returns review passed message with transition hint', () => {
    const body = getOperationBody('record-review-passed', makeState())
    expect(body).toContain('Review passed')
    expect(body).toContain('SUBMITTING_PR')
  })

  it('returns review failed message with transition hint', () => {
    const body = getOperationBody('record-review-failed', makeState())
    expect(body).toContain('Review failed')
    expect(body).toContain('IMPLEMENTING')
  })

  it('returns pr number for record-pr', () => {
    const body = getOperationBody('record-pr', makeState({ prNumber: 7 }))
    expect(body).toContain('#7')
  })

  it('throws when record-pr called without pr number', () => {
    expect(() => getOperationBody('record-pr', makeState())).toThrow(
      "Expected 'prNumber' to be set",
    )
  })

  it('returns ci passed message with transition hint', () => {
    const body = getOperationBody('record-ci-passed', makeState())
    expect(body).toContain('CI passed')
    expect(body).toContain('CHECKING_FEEDBACK')
  })

  it('returns ci failed message with transition hint', () => {
    const body = getOperationBody('record-ci-failed', makeState())
    expect(body).toContain('CI failed')
    expect(body).toContain('IMPLEMENTING')
  })

  it('returns feedback clean message with transition hint', () => {
    const body = getOperationBody('record-feedback-clean', makeState())
    expect(body).toContain('Feedback clean')
    expect(body).toContain('REFLECTING')
  })

  it('returns feedback exists message with transition hint', () => {
    const body = getOperationBody('record-feedback-exists', makeState())
    expect(body).toContain('Feedback exists')
    expect(body).toContain('ADDRESSING_FEEDBACK')
  })

  it('returns feedback addressed message with transition hint', () => {
    const body = getOperationBody('record-feedback-addressed', makeState())
    expect(body).toContain('Feedback addressed')
    expect(body).toContain('VERIFYING')
  })

  it('returns reflection written message with transition hint', () => {
    const body = getOperationBody('record-reflection', makeState())
    expect(body).toContain('Reflection written')
    expect(body).toContain('COMPLETE')
  })
})

describe('getTransitionTitle', () => {
  it('returns state name', () => {
    const title = getTransitionTitle('IMPLEMENTING', makeState())
    expect(title).toStrictEqual('IMPLEMENTING')
  })
})
