import type { GitInfo } from '@nt-ai-lab/deterministic-agent-workflow-dsl'
import { AddressingFeedbackState } from './states/addressing-feedback'
import { AwaitingCiState } from './states/awaiting-ci'
import { BlockedState } from './states/blocked'
import { ImplementingState } from './states/implementing'
import { ReviewingState } from './states/reviewing'
import { SubmittingPrState } from './states/submitting-pr'
import { getInitialWorkflowState } from './workflow-types'

const cleanGit: GitInfo = {
  currentBranch: 'issue-42',
  workingTreeClean: true,
  headCommit: 'abc123',
  changedFilesVsDefault: [],
  hasCommitsVsDefault: true,
}

const addressingFeedback = AddressingFeedbackState.parse('ADDRESSING_FEEDBACK')
const awaitingCi = AwaitingCiState.parse('AWAITING_CI')
const blocked = BlockedState.parse('BLOCKED')
const implementing = ImplementingState.parse('IMPLEMENTING')
const reviewing = ReviewingState.parse('REVIEWING')
const submittingPr = SubmittingPrState.parse('SUBMITTING_PR')

const addressingFeedbackGuard = addressingFeedback.transitionGuard
const awaitingCiGuard = awaitingCi.transitionGuard
const blockedGuard = blocked.transitionGuard
const implementingGuard = implementing.transitionGuard
const reviewingGuard = reviewing.transitionGuard
const submittingPrGuard = submittingPr.transitionGuard
const addressingFeedbackOnEntry = addressingFeedback.onEntry
const implementingOnEntry = implementing.onEntry

describe('workflow state definitions', () => {
  it('requires clean, addressed feedback before returning to review', () => {
    const baseState = getInitialWorkflowState().with({
      currentStateMachineState: 'ADDRESSING_FEEDBACK',
    })
    const context = {
      from: 'ADDRESSING_FEEDBACK' as const,
      to: 'REVIEWING' as const,
      gitInfo: cleanGit,
    }

    expect(addressingFeedbackGuard({ ...context, state: baseState })).toMatchObject({
      pass: false,
      reason: expect.stringContaining('Feedback not addressed'),
    })
    expect(
      addressingFeedbackGuard({
        ...context,
        state: baseState.with({ feedbackAddressed: true, feedbackClean: false }),
      }),
    ).toMatchObject({ pass: false, reason: expect.stringContaining('not yet clear') })
    expect(
      addressingFeedbackGuard({
        ...context,
        state: baseState.with({ feedbackAddressed: true, feedbackClean: true }),
      }),
    ).toStrictEqual({ pass: true })
  })

  it('resets feedback status when feedback addressing begins', () => {
    const state = getInitialWorkflowState().with({
      feedbackAddressed: true,
      feedbackClean: true,
    })

    expect(
      addressingFeedbackOnEntry(state, {
        state,
        gitInfo: cleanGit,
        from: 'AWAITING_PR_FEEDBACK',
        to: 'ADDRESSING_FEEDBACK',
      }),
    ).toMatchObject({
      feedbackAddressed: false,
      feedbackClean: false,
    })
  })

  it('routes the awaiting-CI state according to the recorded CI result', () => {
    const state = getInitialWorkflowState().with({ currentStateMachineState: 'AWAITING_CI' })

    expect(
      awaitingCiGuard({
        state,
        gitInfo: cleanGit,
        from: 'AWAITING_CI',
        to: 'AWAITING_PR_FEEDBACK',
      }),
    ).toMatchObject({ pass: false, reason: expect.stringContaining('CI not passed') })
    expect(
      awaitingCiGuard({
        state: state.with({ ciPassed: true }),
        gitInfo: cleanGit,
        from: 'AWAITING_CI',
        to: 'IMPLEMENTING',
      }),
    ).toMatchObject({ pass: false, reason: expect.stringContaining('CI passed') })
    expect(
      awaitingCiGuard({
        state: state.with({ ciPassed: true }),
        gitInfo: cleanGit,
        from: 'AWAITING_CI',
        to: 'AWAITING_PR_FEEDBACK',
      }),
    ).toStrictEqual({ pass: true })
  })

  it('only leaves BLOCKED by returning to the pre-blocked state', () => {
    const state = getInitialWorkflowState().with({
      currentStateMachineState: 'BLOCKED',
      preBlockedState: 'REVIEWING',
    })

    expect(
      blockedGuard({ state, gitInfo: cleanGit, from: 'BLOCKED', to: 'IMPLEMENTING' }),
    ).toMatchObject({ pass: false, reason: expect.stringContaining('Must return') })
    expect(
      blockedGuard({ state, gitInfo: cleanGit, from: 'BLOCKED', to: 'REVIEWING' }),
    ).toStrictEqual({ pass: true })
  })

  it('requires committed work and a recorded issue before review', () => {
    const state = getInitialWorkflowState()
    const context = { from: 'IMPLEMENTING' as const, to: 'REVIEWING' as const }

    expect(
      implementingGuard({
        ...context,
        state,
        gitInfo: { ...cleanGit, hasCommitsVsDefault: false },
      }),
    ).toMatchObject({ pass: false, reason: expect.stringContaining('No commits') })
    expect(
      implementingGuard({
        ...context,
        state,
        gitInfo: { ...cleanGit, workingTreeClean: false },
      }),
    ).toMatchObject({ pass: false, reason: expect.stringContaining('not clean') })
    expect(implementingGuard({ ...context, state, gitInfo: cleanGit })).toMatchObject({
      pass: false,
      reason: expect.stringContaining('No issue recorded'),
    })
    expect(
      implementingGuard({ ...context, state: state.with({ githubIssue: 42 }), gitInfo: cleanGit }),
    ).toStrictEqual({ pass: true })
  })

  it('allows implementation to transition directly to BLOCKED', () => {
    expect(
      implementingGuard({
        state: getInitialWorkflowState(),
        gitInfo: { ...cleanGit, hasCommitsVsDefault: false },
        from: 'IMPLEMENTING',
        to: 'BLOCKED',
      }),
    ).toStrictEqual({ pass: true })
  })

  it('reports an unknown prior state when BLOCKED was entered without one', () => {
    const state = getInitialWorkflowState().with({ currentStateMachineState: 'BLOCKED' })

    expect(
      blockedGuard({ state, gitInfo: cleanGit, from: 'BLOCKED', to: 'IMPLEMENTING' }),
    ).toMatchObject({ pass: false, reason: expect.stringContaining('unknown') })
  })

  it('resets delivery checks when implementation resumes', () => {
    const state = getInitialWorkflowState().with({
      architectureReviewPassed: true,
      codeReviewPassed: true,
      bugScannerPassed: true,
      taskCheckPassed: true,
      ciPassed: true,
      feedbackClean: true,
      feedbackAddressed: true,
    })

    expect(
      implementingOnEntry(state, {
        state,
        gitInfo: cleanGit,
        from: 'REVIEWING',
        to: 'IMPLEMENTING',
      }),
    ).toMatchObject({
      architectureReviewPassed: false,
      codeReviewPassed: false,
      bugScannerPassed: false,
      taskCheckPassed: false,
      ciPassed: false,
      feedbackClean: false,
      feedbackAddressed: false,
    })
  })

  it('requires every applicable review before submitting a pull request', () => {
    const reviewed = getInitialWorkflowState().with({
      currentStateMachineState: 'REVIEWING',
      architectureReviewPassed: true,
      codeReviewPassed: true,
      bugScannerPassed: true,
    })

    expect(
      reviewingGuard({
        state: reviewed.with({ githubIssue: 42 }),
        gitInfo: cleanGit,
        from: 'REVIEWING',
        to: 'SUBMITTING_PR',
      }),
    ).toMatchObject({ pass: false, reason: expect.stringContaining('task-check') })
    expect(
      reviewingGuard({
        state: reviewed,
        gitInfo: cleanGit,
        from: 'REVIEWING',
        to: 'SUBMITTING_PR',
      }),
    ).toStrictEqual({ pass: true })
    expect(
      reviewingGuard({
        state: reviewed,
        gitInfo: cleanGit,
        from: 'REVIEWING',
        to: 'IMPLEMENTING',
      }),
    ).toMatchObject({ pass: false, reason: expect.stringContaining('All reviews passed') })
  })

  it('requires a recorded pull request before awaiting CI', () => {
    const state = getInitialWorkflowState().with({ currentStateMachineState: 'SUBMITTING_PR' })

    expect(
      submittingPrGuard({ state, gitInfo: cleanGit, from: 'SUBMITTING_PR', to: 'AWAITING_CI' }),
    ).toMatchObject({ pass: false, reason: expect.stringContaining('prNumber not set') })
    expect(
      submittingPrGuard({
        state: state.with({ prNumber: 42 }),
        gitInfo: cleanGit,
        from: 'SUBMITTING_PR',
        to: 'AWAITING_CI',
      }),
    ).toStrictEqual({ pass: true })
  })
})
