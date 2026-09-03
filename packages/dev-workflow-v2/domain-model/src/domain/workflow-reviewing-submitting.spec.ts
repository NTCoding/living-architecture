import type { StoredReview } from '@nt-ai-lab/deterministic-agent-workflow-engine'
import { WorkflowStateError } from '@nt-ai-lab/deterministic-agent-workflow-engine'
import {
  spec,
  eventsToReviewing,
  eventsToSubmittingPr,
  eventsToAwaitingCi,
  makeDeps,
  reviewRecorded,
  buildTestWorkflow,
  rehydrateTestWorkflow,
} from './__fixtures__/workflow-test-fixtures'
import { ReviewingState } from './states/reviewing'
import { WorkflowState } from './workflow-types'

const reviewingState = ReviewingState.parse('REVIEWING')
const CREATE_PR_DESCRIPTION = 'A'.repeat(100)

const CREATE_PR_OPTIONS = [
  '--title',
  'Add workflow create-pr',
  '--description',
  CREATE_PR_DESCRIPTION,
  '--problem',
  'Agents could create draft PRs directly.',
  '--acceptance-criteria',
  '- PR is ready for review\n- PR body follows the workflow structure',
  '--key-changes',
  '- Add structured create-pr command',
  '--architecture-impact',
  'Workflow owns PR body creation.',
  '--validation',
  '- pnpm test',
  '--notes',
  'None.',
] as const

function getReviewingTransitionGuard(): NonNullable<typeof reviewingState.transitionGuard> {
  return reviewingState.transitionGuard
}

function getFailureReason(result: { readonly pass: boolean; readonly reason?: string }): string {
  if (result.pass || result.reason === undefined) {
    throw new WorkflowStateError('Expected failed REVIEWING transition guard result.')
  }
  return result.reason
}

function createStoredReview(
  id: number,
  reviewType: StoredReview['reviewType'],
  verdict: StoredReview['verdict'],
): StoredReview {
  return {
    id,
    sessionId: 'test-session',
    createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, 0) + id * 1000).toISOString(),
    reviewType,
    sourceState: 'REVIEWING',
    verdict,
    summary: `${reviewType} ${verdict}`,
    findings: [],
  }
}

describe('Workflow', () => {
  describe('review details', () => {
    it('returns recorded reviews from platform review storage', () => {
      const reviews = [createStoredReview(1, 'task-check', 'PASS')]
      const workflow = buildTestWorkflow(makeDeps({ listSessionReviews: () => reviews }))

      expect(workflow.getRecordedReviews()).toStrictEqual(reviews)
    })

    it('returns review details when review id exists', () => {
      const reviews = [createStoredReview(1, 'task-check', 'FAIL')]
      const workflow = buildTestWorkflow(makeDeps({ listSessionReviews: () => reviews }))

      expect(workflow.getReviewDetails(1)).toStrictEqual(reviews[0])
    })

    it('returns latest review when review type has multiple attempts', () => {
      const reviews = [
        createStoredReview(1, 'task-check', 'FAIL'),
        createStoredReview(2, 'task-check', 'PASS'),
      ]
      const workflow = buildTestWorkflow(makeDeps({ listSessionReviews: () => reviews }))

      expect(workflow.getLatestReviewByType('task-check')).toStrictEqual(reviews[1])
    })

    it('throws when requested review id does not exist', () => {
      const workflow = buildTestWorkflow(makeDeps({ listSessionReviews: () => [] }))

      expect(() => workflow.getReviewDetails(99)).toThrow('Review 99 not found in current session.')
    })
  })

  describe('REVIEWING state', () => {
    it('marks architecture review as passed when latest architecture review verdict passed', () => {
      const workflow = rehydrateTestWorkflow(WorkflowState.replay(eventsToReviewing()), makeDeps())
      workflow.appendEvent(reviewRecorded('architecture-review', 'PASS'))

      expect(workflow.getState().architectureReviewPassed).toBe(true)
    })

    it('marks architecture review as failed when latest architecture review verdict failed', () => {
      const workflow = rehydrateTestWorkflow(WorkflowState.replay(eventsToReviewing()), makeDeps())
      workflow.appendEvent(reviewRecorded('architecture-review', 'PASS'))
      workflow.appendEvent(reviewRecorded('architecture-review', 'FAIL'))

      expect(workflow.getState().architectureReviewPassed).toBe(false)
    })

    it('marks code review as passed when latest code review verdict passed', () => {
      const workflow = rehydrateTestWorkflow(WorkflowState.replay(eventsToReviewing()), makeDeps())
      workflow.appendEvent(reviewRecorded('code-review', 'PASS'))

      expect(workflow.getState().codeReviewPassed).toBe(true)
    })

    it('marks bug scanner as failed when latest bug scanner verdict failed', () => {
      const workflow = rehydrateTestWorkflow(WorkflowState.replay(eventsToReviewing()), makeDeps())
      workflow.appendEvent(reviewRecorded('bug-scanner', 'FAIL'))

      expect(workflow.getState().bugScannerPassed).toBe(false)
    })

    it('marks task check as passed when latest task check verdict passed', () => {
      const workflow = rehydrateTestWorkflow(WorkflowState.replay(eventsToReviewing()), makeDeps())
      workflow.appendEvent(reviewRecorded('task-check', 'PASS'))

      expect(workflow.getState().taskCheckPassed).toBe(true)
    })

    it('uses the latest task check review attempt when multiple attempts exist', () => {
      const workflow = rehydrateTestWorkflow(WorkflowState.replay(eventsToReviewing()), makeDeps())
      workflow.appendEvent(reviewRecorded('task-check', 'FAIL'))
      workflow.appendEvent(reviewRecorded('task-check', 'PASS'))

      expect(workflow.getState().taskCheckPassed).toBe(true)
    })

    it('rejects SUBMITTING_PR without task check when no issue is recorded and required reviews failed', () => {
      const result = getReviewingTransitionGuard()({
        state: buildTestWorkflow(makeDeps()).getState().with({
          currentStateMachineState: 'REVIEWING',
          architectureReviewPassed: false,
          codeReviewPassed: false,
          bugScannerPassed: false,
        }),
        gitInfo: makeDeps().getGitInfo(),
        from: 'REVIEWING',
        to: 'SUBMITTING_PR',
      })

      expect(result.pass).toStrictEqual(false)
      expect(getFailureReason(result)).toContain('architecture-review')
      expect(getFailureReason(result)).toContain('code-review')
      expect(getFailureReason(result)).toContain('bug-scanner')
    })
  })

  describe('SUBMITTING_PR state', () => {
    it('records PR number with URL', () => {
      const { result, state, events } = spec
        .given(...eventsToSubmittingPr())
        .when((wf) => wf.executeRecording('record-pr', 99, 'https://github.com/x/y/pull/99'))
      expect(result).toStrictEqual({ pass: true })
      expect(state.prNumber).toBe(99)
      expect(state.prUrl).toBe('https://github.com/x/y/pull/99')
      expect(events).toStrictEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'pr-recorded',
            prNumber: 99,
          }),
        ]),
      )
    })

    it('records PR number without URL', () => {
      const { result, state, events } = spec
        .given(...eventsToSubmittingPr())
        .when((wf) => wf.executeRecording('record-pr', 99))
      expect(result).toStrictEqual({ pass: true })
      expect(state.prNumber).toBe(99)
      expect(state.prUrl).toBeUndefined()
      expect(events).toStrictEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'pr-recorded',
            prNumber: 99,
          }),
        ]),
      )
    })

    it('fails record-pr in non-SUBMITTING_PR states', () => {
      const { result } = spec.given().when((wf) => wf.executeRecording('record-pr', 1))
      expect(result.pass).toBe(false)
    })

    it('blocks create-pr outside SUBMITTING_PR state', () => {
      const workflow = buildTestWorkflow(makeDeps())

      const result = workflow.createPr(CREATE_PR_OPTIONS)

      expect(result.pass).toBe(false)
      expect(workflow.getState().prNumber).toBeUndefined()
    })

    it('records ready pull request with structured body when create-pr succeeds', () => {
      const capturedRequests: {
        readonly branch: string
        readonly title: string
        readonly body: string
      }[] = []
      const workflow = rehydrateTestWorkflow(
        WorkflowState.replay(eventsToSubmittingPr()),
        makeDeps({
          createPullRequest: (request) => {
            capturedRequests.push(request)
            return {
              prNumber: 123,
              prUrl: 'https://github.com/x/y/pull/123',
              isDraft: false,
            }
          },
        }),
      )

      const result = workflow.createPr(CREATE_PR_OPTIONS)

      expect(result).toStrictEqual({ pass: true })
      expect(capturedRequests).toStrictEqual([
        {
          branch: 'issue-42',
          title: 'Add workflow create-pr',
          body: [
            `## Description\n\n${CREATE_PR_DESCRIPTION}`,
            '## Linked Issue\n\nCloses #42',
            '## What Problem Does This PR Solve?\n\nAgents could create draft PRs directly.',
            '## Acceptance Criteria\n\n- PR is ready for review\n- PR body follows the workflow structure',
            '## Key Changes\n\n- Add structured create-pr command',
            '## Notable Architectural Changes / Impact\n\nWorkflow owns PR body creation.',
            '## Validation\n\n- pnpm test',
            '## Notes\n\nNone.',
          ].join('\n\n'),
        },
      ])
      expect(workflow.getState()).toMatchObject({
        prNumber: 123,
        prUrl: 'https://github.com/x/y/pull/123',
      })
    })

    it('blocks create-pr when issue is not recorded', () => {
      const workflow = rehydrateTestWorkflow(
        {
          ...WorkflowState.replay(eventsToSubmittingPr()),
          githubIssue: undefined,
        },
        makeDeps(),
      )

      const result = workflow.createPr(CREATE_PR_OPTIONS)

      expect(result.pass).toBe(false)
      expect(workflow.getState().prNumber).toBeUndefined()
    })

    it('blocks create-pr when branch is not recorded', () => {
      const workflow = rehydrateTestWorkflow(
        {
          ...WorkflowState.replay(eventsToSubmittingPr()),
          featureBranch: undefined,
        },
        makeDeps(),
      )

      const result = workflow.createPr(CREATE_PR_OPTIONS)

      expect(result).toStrictEqual({
        pass: false,
        reason: 'featureBranch not set. Record the branch before creating a PR.',
      })
    })

    it('does not record pull request when create-pr returns draft pull request', () => {
      const workflow = rehydrateTestWorkflow(
        WorkflowState.replay(eventsToSubmittingPr()),
        makeDeps({
          createPullRequest: () => ({
            prNumber: 123,
            prUrl: 'https://github.com/x/y/pull/123',
            isDraft: true,
          }),
        }),
      )

      const result = workflow.createPr(CREATE_PR_OPTIONS)

      expect(result.pass).toBe(false)
      expect(workflow.getState().prNumber).toBeUndefined()
      expect(workflow.getPendingEvents()).toStrictEqual([])
    })

    it('rejects unknown options when creating pull request', () => {
      const workflow = rehydrateTestWorkflow(
        WorkflowState.replay(eventsToSubmittingPr()),
        makeDeps(),
      )

      const result = workflow.createPr(['--draft'])

      expect(result.pass).toBe(false)
      expect(workflow.getState().prNumber).toBeUndefined()
    })

    it('requires acceptance criteria when creating pull request', () => {
      const workflow = rehydrateTestWorkflow(
        WorkflowState.replay(eventsToSubmittingPr()),
        makeDeps(),
      )

      const result = workflow.createPr([
        '--title',
        'Add workflow create-pr',
        '--description',
        CREATE_PR_DESCRIPTION,
        '--problem',
        'Agents could create draft PRs directly.',
        '--key-changes',
        '- Add structured create-pr command',
        '--architecture-impact',
        'Workflow owns PR body creation.',
        '--validation',
        '- pnpm test',
        '--notes',
        'None.',
      ])

      expect(result.pass).toBe(false)
      expect(workflow.getState().prNumber).toBeUndefined()
    })

    it('rejects non-string arguments when creating pull request', () => {
      const workflow = rehydrateTestWorkflow(
        WorkflowState.replay(eventsToSubmittingPr()),
        makeDeps(),
      )

      const result = workflow.createPr([123])

      expect(result.pass).toBe(false)
      expect(workflow.getState().prNumber).toBeUndefined()
    })

    it('does not record pull request when create-pr command fails', () => {
      const workflow = rehydrateTestWorkflow(
        WorkflowState.replay(eventsToSubmittingPr()),
        makeDeps({
          createPullRequest: () => {
            throw new WorkflowStateError('GitHub refused pull request creation')
          },
        }),
      )

      const result = workflow.createPr(CREATE_PR_OPTIONS)

      expect(result.pass).toBe(false)
      expect(workflow.getState().prNumber).toBeUndefined()
      expect(workflow.getPendingEvents()).toStrictEqual([])
    })
  })

  describe('AWAITING_CI state', () => {
    it('records CI passed', () => {
      const { result, state } = spec
        .given(...eventsToAwaitingCi())
        .when((wf) => wf.executeRecording('record-ci-passed'))
      expect(result).toStrictEqual({ pass: true })
      expect(state.ciPassed).toBe(true)
    })

    it('records CI failed', () => {
      const { result, state } = spec
        .given(...eventsToAwaitingCi())
        .when((wf) => wf.executeRecording('record-ci-failed', 'test failures'))
      expect(result).toStrictEqual({ pass: true })
      expect(state.ciPassed).toBe(false)
    })

    it('fails record-ci-passed in non-AWAITING_CI states', () => {
      const { result } = spec.given().when((wf) => wf.executeRecording('record-ci-passed'))
      expect(result.pass).toBe(false)
    })

    it('fails record-ci-failed in non-AWAITING_CI states', () => {
      const { result } = spec.given().when((wf) => wf.executeRecording('record-ci-failed', 'err'))
      expect(result.pass).toBe(false)
    })
  })
})
