import type { GitInfo } from '@nt-ai-lab/deterministic-agent-workflow-dsl'
import { describe, expect, it, vi } from 'vitest'
import { AddressingFeedbackState } from './states/addressing-feedback'
import { BlockedState } from './states/blocked'
import { ImplementingState } from './states/implementing'
import { ReviewingState } from './states/reviewing'
import { SubmittingPrState } from './states/submitting-pr'
import { ReviewerDefinition } from './reviewer-definitions'
import { getInitialWorkflowState } from './workflow-types'

const cleanGit: GitInfo = {
  currentBranch: 'issue-42',
  workingTreeClean: true,
  headCommit: 'abc123',
  changedFilesVsDefault: [],
  hasCommitsVsDefault: true,
}

const addressingFeedback = AddressingFeedbackState.parse('ADDRESSING_FEEDBACK')
const blocked = BlockedState.parse('BLOCKED')
const implementing = ImplementingState.parse('IMPLEMENTING')
const reviewing = ReviewingState.parse('REVIEWING')
const submittingPr = SubmittingPrState.parse('SUBMITTING_PR')

const blockedGuard = blocked.transitionGuard
const implementingGuard = implementing.transitionGuard
const reviewingGuard = reviewing.transitionGuard
const submittingPrGuard = submittingPr.transitionGuard
const addressingFeedbackOnEntry = addressingFeedback.onEntry
const implementingOnEntry = implementing.onEntry

describe('workflow state definitions', () => {
  it('sends feedback remediation back through verification for a follow-up review', () => {
    expect(addressingFeedback.canTransitionTo).toStrictEqual(['VERIFYING', 'BLOCKED'])
    expect(addressingFeedback.allowedWorkflowOperations).toStrictEqual([])
  })

  it('resets feedback status when feedback addressing begins', () => {
    const state = getInitialWorkflowState().with({
      feedbackAddressed: true,
      feedbackClean: true,
    })

    expect(addressingFeedbackOnEntry(state)).toMatchObject({
      feedbackAddressed: false,
      feedbackClean: false,
    })
  })

  it('only leaves BLOCKED by returning to the pre-blocked state', () => {
    const state = getInitialWorkflowState().with({
      currentStateMachineState: 'BLOCKED',
      preBlockedState: 'REVIEWING',
    })

    expect(
      blockedGuard({
        state,
        gitInfo: cleanGit,
        from: 'BLOCKED',
        to: 'IMPLEMENTING',
      }),
    ).toMatchObject({
      pass: false,
      reason: expect.stringContaining('Must return'),
    })
    expect(
      blockedGuard({
        state,
        gitInfo: cleanGit,
        from: 'BLOCKED',
        to: 'REVIEWING',
      }),
    ).toStrictEqual({
      pass: true,
    })
  })

  it('requires committed work and a recorded issue before review', () => {
    const state = getInitialWorkflowState()
    const context = {
      from: 'IMPLEMENTING' as const,
      to: 'REVIEWING' as const,
    }

    expect(
      implementingGuard({
        ...context,
        state,
        gitInfo: {
          ...cleanGit,
          hasCommitsVsDefault: false,
        },
      }),
    ).toMatchObject({
      pass: false,
      reason: expect.stringContaining('No commits'),
    })
    expect(
      implementingGuard({
        ...context,
        state,
        gitInfo: {
          ...cleanGit,
          workingTreeClean: false,
        },
      }),
    ).toMatchObject({
      pass: false,
      reason: expect.stringContaining('not clean'),
    })
    expect(
      implementingGuard({
        ...context,
        state,
        gitInfo: cleanGit,
      }),
    ).toMatchObject({
      pass: false,
      reason: expect.stringContaining('No issue recorded'),
    })
    expect(
      implementingGuard({
        ...context,
        state: state.with({
          githubIssue: 42,
        }),
        gitInfo: cleanGit,
      }),
    ).toStrictEqual({
      pass: true,
    })
  })

  it('allows implementation to transition directly to BLOCKED', () => {
    expect(
      implementingGuard({
        state: getInitialWorkflowState(),
        gitInfo: {
          ...cleanGit,
          hasCommitsVsDefault: false,
        },
        from: 'IMPLEMENTING',
        to: 'BLOCKED',
      }),
    ).toStrictEqual({
      pass: true,
    })
  })

  it('reports an unknown prior state when BLOCKED was entered without one', () => {
    const state = getInitialWorkflowState().with({
      currentStateMachineState: 'BLOCKED',
    })

    expect(
      blockedGuard({
        state,
        gitInfo: cleanGit,
        from: 'BLOCKED',
        to: 'IMPLEMENTING',
      }),
    ).toMatchObject({
      pass: false,
      reason: expect.stringContaining('unknown'),
    })
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

    expect(implementingOnEntry(state)).toMatchObject({
      architectureReviewPassed: false,
      codeReviewPassed: false,
      bugScannerPassed: false,
      taskCheckPassed: false,
      ciPassed: false,
      feedbackClean: false,
      feedbackAddressed: false,
    })
  })

  it('refuses manual transitions out of REVIEWING because the review gate owns them', () => {
    const state = getInitialWorkflowState().with({
      currentStateMachineState: 'REVIEWING',
    })

    for (const to of ['ADDRESSING_FEEDBACK', 'REFLECTING'] as const) {
      expect(
        reviewingGuard({
          state,
          gitInfo: cleanGit,
          from: 'REVIEWING',
          to,
        }),
      ).toMatchObject({
        pass: false,
        reason: expect.stringContaining('verify-pr-review-gate'),
      })
    }
  })

  it('requires a verified commit and a complete snapshot before review', () => {
    const headCommit = 'c'.repeat(40)
    const state = getInitialWorkflowState().with({
      currentStateMachineState: 'SUBMITTING_PR',
      prNumber: 42,
      pullRequestSnapshot: {
        repository: 'example/repo',
        issue: 42,
        branch: 'issue-42',
        prNumber: 42,
        prUrl: 'https://github.com/example/repo/pull/42',
        baseRevision: 'a'.repeat(40),
        headRevision: headCommit,
      },
    })

    expect(
      submittingPrGuard({
        state: state.with({ localVerification: { status: 'not-run' } }),
        gitInfo: { ...cleanGit, headCommit },
        from: 'SUBMITTING_PR',
        to: 'REVIEWING',
      }),
    ).toMatchObject({
      pass: false,
      reason: expect.stringContaining('locally verified commit'),
    })
    expect(
      submittingPrGuard({
        state: state.with({
          localVerification: { status: 'passed', headCommit },
        }),
        gitInfo: { ...cleanGit, headCommit },
        from: 'SUBMITTING_PR',
        to: 'REVIEWING',
      }),
    ).toStrictEqual({
      pass: true,
    })
  })

  it('runs the code review when REVIEWING is entered', () => {
    const runCodeReview = vi.fn()
    const reviewers = ReviewerDefinition.parseAll([
      { reviewType: 'code-review', agentInstructions: 'agents/code-review.md', version: '1' },
    ])
    const reviewing = ReviewingState.parse('REVIEWING', {
      reviewers,
      runCodeReview,
    })

    reviewing.afterEntry()

    expect(runCodeReview).toHaveBeenCalledOnce()
    expect(runCodeReview).toHaveBeenCalledWith(reviewers)
  })

  it('does not run a code review when REVIEWING is entered without deps', () => {
    const reviewing = ReviewingState.parse('REVIEWING')

    expect(() => reviewing.afterEntry()).not.toThrow()
  })
})
