import { SyncReviewerSatisfaction } from './sync-reviewer-satisfaction'
import { configureWorkflow } from './configure-workflow'
import { WorkflowState } from '@living-architecture/dev-workflow-v2-domain-model/domain/workflow-types'

const headRevision = 'b'.repeat(40)
const snapshot = {
  repository: 'example/repo',
  issue: 42,
  branch: 'issue-42',
  prNumber: 99,
  prUrl: 'https://github.com/example/repo/pull/99',
  baseRevision: 'a'.repeat(40),
  headRevision,
}

it('delegates reviewer satisfaction sync to the workflow aggregate', () => {
  const workflow = configureWorkflow({}).buildWorkflow(
    WorkflowState.initial().with({
      currentStateMachineState: 'REVIEWING',
      prNumber: snapshot.prNumber,
      prUrl: snapshot.prUrl,
      pullRequestSnapshot: snapshot,
    }),
    {
      runLocalVerification: () => undefined,
      getGitInfo: () => ({
        currentBranch: 'main',
        workingTreeClean: true,
        defaultBranch: 'main',
        headCommit: headRevision,
        changedFilesVsDefault: [],
        hasCommitsVsDefault: false,
      }),
      getPrFeedback: () => ({
        reviewDecision: null,
        coderabbitReviewSeen: false,
        unresolvedCount: 0,
        threads: [],
      }),
      getRequiredPullRequestChecks: () => ({
        headRevision,
        checks: [],
      }),
      createPullRequest: () => ({
        prNumber: 1,
        prUrl: 'https://github.com/example/repo/pull/1',
        isDraft: false,
        repository: 'example/repo',
        baseRevision: 'a'.repeat(40),
        headRevision,
      }),
      listSessionReviews: () => [
        {
          id: 1,
          sessionId: 'session',
          createdAt: '2026-01-01T00:00:00Z',
          reviewType: 'architecture-review',
          verdict: 'PASS',
          findings: [],
          pullRequestNumber: snapshot.prNumber,
          completionProvenance: {
            bundleId: 'bundle',
            providerSessionId: 'provider-session',
            providerRunId: 'provider-run',
            baseRevision: snapshot.baseRevision,
            headRevision,
            exactFilesDigest: 'digest',
            exactFiles: ['file.ts'],
            reviewerDefinitionVersion: 'v1',
          },
        },
      ],
      sleepMs: () => undefined,
      now: () => '2026-01-01T00:00:00Z',
    },
  )
  const result = new SyncReviewerSatisfaction(workflow).execute({})
  expect(result).toStrictEqual({ result: { pass: true } })
  expect(workflow.getState().reviewerSatisfaction).toStrictEqual({
    'architecture-review': {
      status: 'satisfied',
      reviewId: 1,
      headRevision,
    },
    'code-review': { status: 'not-run' },
    'bug-scanner': { status: 'not-run' },
    'task-check': { status: 'not-run' },
  })
})
