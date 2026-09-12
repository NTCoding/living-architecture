import type { GitInfo } from '@nt-ai-lab/deterministic-agent-workflow-dsl'
import { ImplementingState } from './states/implementing'
import { ReviewingState } from './states/reviewing'
import { SubmittingPrState } from './states/submitting-pr'
import { AddressingFeedbackState } from './states/addressing-feedback'
import { BlockedState } from './states/blocked'
import { WorkflowTransitionContext } from './workflow-transition-context'
import { getInitialWorkflowState } from './workflow-types'

const gitInfo: GitInfo = {
  currentBranch: 'branch',
  workingTreeClean: true,
  headCommit: 'abc',
  changedFilesVsDefault: [],
  hasCommitsVsDefault: true,
}

describe('workflow state definitions', () => {
  it('requires approval from every reviewer before human review', () => {
    const state = getInitialWorkflowState().with({ currentStateMachineState: 'REVIEWING' })
    const reviewing = ReviewingState.parse('REVIEWING')
    expect(
      reviewing.transitionGuard({ state, gitInfo, from: 'REVIEWING', to: 'HUMAN_REVIEWING' }).pass,
    ).toBe(false)
    const reviewerStatuses = {
      'architecture-review': 'APPROVED',
      'code-review': 'APPROVED',
      'bug-scanner': 'APPROVED',
      'task-check': 'APPROVED',
      coderabbit: 'APPROVED',
    } satisfies Readonly<Record<string, string>>
    expect(
      reviewing.transitionGuard({
        state: state.with({ reviewerStatuses }),
        gitInfo,
        from: 'REVIEWING',
        to: 'HUMAN_REVIEWING',
      }),
    ).toStrictEqual({ pass: true })
  })

  it('resets reviewer status when implementation begins', () => {
    const state = ImplementingState.parse('IMPLEMENTING').onEntry(getInitialWorkflowState())
    expect(state.reviewerStatuses.toJSON()).toMatchObject({ coderabbit: 'PENDING' })
  })

  it('requires a committed, clean issue branch before submitting', () => {
    const state = getInitialWorkflowState()
    const implementing = ImplementingState.parse('IMPLEMENTING')
    expect(
      implementing.transitionGuard({
        state,
        gitInfo: { ...gitInfo, hasCommitsVsDefault: false },
        from: 'IMPLEMENTING',
        to: 'SUBMITTING_PR',
      }).pass,
    ).toBe(false)
    expect(
      implementing.transitionGuard({
        state,
        gitInfo: { ...gitInfo, workingTreeClean: false },
        from: 'IMPLEMENTING',
        to: 'SUBMITTING_PR',
      }).pass,
    ).toBe(false)
    expect(
      implementing.transitionGuard({ state, gitInfo, from: 'IMPLEMENTING', to: 'SUBMITTING_PR' })
        .pass,
    ).toBe(false)
    expect(
      implementing.transitionGuard({
        state: state.with({ githubIssue: 42, featureBranch: 'issue-42' }),
        gitInfo,
        from: 'IMPLEMENTING',
        to: 'SUBMITTING_PR',
      }),
    ).toStrictEqual({ pass: true })
  })

  it('requires a recorded pull request before reviewing', () => {
    const submitting = SubmittingPrState.parse('SUBMITTING_PR')
    expect(
      submitting.transitionGuard({
        state: getInitialWorkflowState(),
        gitInfo,
        from: 'SUBMITTING_PR',
        to: 'REVIEWING',
      }).pass,
    ).toBe(false)
    expect(
      submitting.transitionGuard({
        state: getInitialWorkflowState().with({ prNumber: 1 }),
        gitInfo,
        from: 'SUBMITTING_PR',
        to: 'REVIEWING',
      }),
    ).toStrictEqual({ pass: true })
  })

  it('allows addressing feedback only when a reviewer has an open finding', () => {
    const reviewing = ReviewingState.parse('REVIEWING')
    const state = getInitialWorkflowState()
    expect(
      reviewing.transitionGuard({ state, gitInfo, from: 'REVIEWING', to: 'ADDRESSING_FEEDBACK' })
        .pass,
    ).toBe(false)
    expect(
      reviewing.transitionGuard({
        state: state.with({
          reviewerStatuses: { ...state.reviewerStatuses.toJSON(), coderabbit: 'OPEN_FEEDBACK' },
        }),
        gitInfo,
        from: 'REVIEWING',
        to: 'ADDRESSING_FEEDBACK',
      }),
    ).toStrictEqual({ pass: true })
  })

  it('requires blocked state to return to the recorded state', () => {
    const state = getInitialWorkflowState().with({ preBlockedState: 'REVIEWING' })
    const blocked = BlockedState.parse('BLOCKED')
    expect(
      blocked.transitionGuard({ state, gitInfo, from: 'BLOCKED', to: 'IMPLEMENTING' }).pass,
    ).toBe(false)
    expect(
      blocked.transitionGuard({ state, gitInfo, from: 'BLOCKED', to: 'REVIEWING' }),
    ).toStrictEqual({ pass: true })
    const result = blocked.transitionGuard({
      state: getInitialWorkflowState(),
      gitInfo,
      from: 'BLOCKED',
      to: 'IMPLEMENTING',
    })
    expect(result).toMatchObject({ pass: false, reason: expect.stringContaining('unknown') })
  })

  it('requires a clean tree before returning to reviewing but allows blocking', () => {
    const addressing = AddressingFeedbackState.parse('ADDRESSING_FEEDBACK')
    const state = getInitialWorkflowState().with({
      currentStateMachineState: 'ADDRESSING_FEEDBACK',
    })
    expect(
      addressing.transitionGuard({
        state,
        gitInfo: { ...gitInfo, workingTreeClean: false },
        from: 'ADDRESSING_FEEDBACK',
        to: 'REVIEWING',
      }),
    ).toMatchObject({ pass: false, reason: expect.stringContaining('clean') })
    expect(
      addressing.transitionGuard({
        state,
        gitInfo,
        from: 'ADDRESSING_FEEDBACK',
        to: 'REVIEWING',
      }),
    ).toStrictEqual({ pass: true })
    expect(
      addressing.transitionGuard({ state, gitInfo, from: 'ADDRESSING_FEEDBACK', to: 'BLOCKED' }),
    ).toStrictEqual({ pass: true })
  })

  it('builds a transition context and runs feedback entry', () => {
    const state = getInitialWorkflowState()
    expect(
      WorkflowTransitionContext.from({ state, gitInfo, from: 'IMPLEMENTING', to: 'SUBMITTING_PR' }),
    ).toMatchObject({ state, gitInfo, from: 'IMPLEMENTING', to: 'SUBMITTING_PR' })
    expect(AddressingFeedbackState.parse('ADDRESSING_FEEDBACK')).toBeDefined()
  })

  it('allows any state to enter blocked', () => {
    expect(
      ImplementingState.parse('IMPLEMENTING').transitionGuard({
        state: getInitialWorkflowState(),
        gitInfo: { ...gitInfo, hasCommitsVsDefault: false },
        from: 'IMPLEMENTING',
        to: 'BLOCKED',
      }),
    ).toStrictEqual({ pass: true })
  })
})
