import {
  describe, it, expect 
} from 'vitest'
import {
  spec,
  eventsToAddressingFeedback,
  unresolvedThread,
} from './fixtures/workflow-test-fixtures'
import { addressingFeedbackState } from './states/addressing-feedback'

function addressingTransitionGuard(): NonNullable<typeof addressingFeedbackState.transitionGuard> {
  const guard = addressingFeedbackState.transitionGuard
  if (guard === undefined) {
    throw new TypeError('Missing ADDRESSING_FEEDBACK transition guard')
  }
  return guard
}

describe('ADDRESSING_FEEDBACK workflow behavior', () => {
  it('verifies addressed feedback against live GitHub state', () => {
    const outcome = spec
      .given(...eventsToAddressingFeedback())
      .withDeps({
        getPrFeedback: () => ({
          reviewDecision: 'APPROVED',
          coderabbitReviewSeen: true,
          unresolvedCount: 0,
          threads: [],
        }),
      })
      .when((wf) => wf.verifyFeedbackAddressed())

    expect(outcome.result).toStrictEqual({ pass: true })
    expect(outcome.events).toStrictEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'feedback-checked',
          clean: true,
        }),
        expect.objectContaining({ type: 'feedback-addressed' }),
      ]),
    )
    expect(outcome.state).toMatchObject({
      feedbackAddressed: true,
      feedbackClean: true,
    })
  })

  it('fails verification when GitHub still reports CHANGES_REQUESTED and unresolved feedback', () => {
    const outcome = spec
      .given(...eventsToAddressingFeedback())
      .withDeps({
        getPrFeedback: () => ({
          reviewDecision: 'CHANGES_REQUESTED',
          coderabbitReviewSeen: true,
          unresolvedCount: 1,
          threads: [unresolvedThread('t1')],
        }),
      })
      .when((wf) => wf.verifyFeedbackAddressed())

    expect(outcome.result).toMatchObject({
      pass: false,
      reason: expect.stringContaining('CHANGES_REQUESTED'),
    })
    expect(outcome.events).toStrictEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'feedback-checked',
          clean: false,
          unresolvedCount: 1,
        }),
      ]),
    )
    expect(outcome.state).toMatchObject({
      feedbackAddressed: false,
      feedbackClean: false,
    })
  })

  it('fails verification when only one blocking GitHub condition remains', () => {
    const unresolvedOnly = spec
      .given(...eventsToAddressingFeedback())
      .withDeps({
        getPrFeedback: () => ({
          reviewDecision: 'APPROVED',
          coderabbitReviewSeen: true,
          unresolvedCount: 1,
          threads: [unresolvedThread('t1')],
        }),
      })
      .when((wf) => wf.verifyFeedbackAddressed())
    const changesRequestedOnly = spec
      .given(...eventsToAddressingFeedback())
      .withDeps({
        getPrFeedback: () => ({
          reviewDecision: 'CHANGES_REQUESTED',
          coderabbitReviewSeen: true,
          unresolvedCount: 0,
          threads: [],
        }),
      })
      .when((wf) => wf.verifyFeedbackAddressed())

    expect(unresolvedOnly.result).toMatchObject({
      pass: false,
      reason: expect.stringContaining('1 unresolved feedback threads'),
    })
    expect(changesRequestedOnly.result).toMatchObject({
      pass: false,
      reason: expect.stringContaining('CHANGES_REQUESTED review status'),
    })
  })

  it('fails verification when run outside ADDRESSING_FEEDBACK, without a PR number, or when fetch throws', () => {
    const outsideState = spec.given().when((wf) => wf.verifyFeedbackAddressed())
    const noPrNumber = spec
      .given({
        type: 'transitioned',
        at: '2026-01-01T00:00:00Z',
        from: 'IMPLEMENTING',
        to: 'ADDRESSING_FEEDBACK',
      })
      .when((wf) => wf.verifyFeedbackAddressed())
    const fetchError = spec
      .given(...eventsToAddressingFeedback())
      .withDeps({
        getPrFeedback: () => {
          throw new TypeError('GitHub unavailable')
        },
      })
      .when((wf) => wf.verifyFeedbackAddressed())

    expect(outsideState.result).toMatchObject({
      pass: false,
      reason: expect.stringContaining('verify-feedback-addressed is not allowed in state'),
    })
    expect(noPrNumber.result).toMatchObject({
      pass: false,
      reason: expect.stringContaining('prNumber not set'),
    })
    expect(fetchError.result).toMatchObject({
      pass: false,
      reason: expect.stringContaining('Unable to fetch PR feedback'),
    })
  })

  it('resets feedback flags on entry and blocks REVIEWING when the PR is not yet clean', () => {
    const guard = addressingTransitionGuard()
    const entered = spec.given(...eventsToAddressingFeedback()).when((wf) => wf.getState())
    const guardResult = guard({
      state: {
        currentStateMachineState: 'ADDRESSING_FEEDBACK',
        architectureReviewPassed: false,
        codeReviewPassed: false,
        bugScannerPassed: false,
        taskCheckPassed: false,
        ciPassed: false,
        feedbackClean: false,
        feedbackAddressed: true,
      },
      gitInfo: {
        currentBranch: 'issue-42',
        workingTreeClean: true,
        headCommit: 'abc123',
        changedFilesVsDefault: [],
        hasCommitsVsDefault: true,
      },
      from: 'ADDRESSING_FEEDBACK',
      to: 'REVIEWING',
    })

    expect(entered.state).toMatchObject({
      feedbackAddressed: false,
      feedbackClean: false,
    })
    expect(guardResult).toMatchObject({
      pass: false,
      reason: expect.stringContaining('feedback is not yet clear'),
    })
  })

  it('allows transition to BLOCKED even when feedback is not yet addressed', () => {
    const guard = addressingTransitionGuard()
    const guardResult = guard({
      state: {
        currentStateMachineState: 'ADDRESSING_FEEDBACK',
        architectureReviewPassed: false,
        codeReviewPassed: false,
        bugScannerPassed: false,
        taskCheckPassed: false,
        ciPassed: false,
        feedbackClean: false,
        feedbackAddressed: false,
      },
      gitInfo: {
        currentBranch: 'issue-42',
        workingTreeClean: true,
        headCommit: 'abc123',
        changedFilesVsDefault: [],
        hasCommitsVsDefault: true,
      },
      from: 'ADDRESSING_FEEDBACK',
      to: 'BLOCKED',
    })

    expect(guardResult).toStrictEqual({ pass: true })
  })
})
