import { VerifyPrReviewGate } from './verify-pr-review-gate'
import { configureWorkflow } from './configure-workflow'
import { WorkflowState } from '@living-architecture/dev-workflow-v2-domain-model/domain/workflow-types'
import { vi } from 'vitest'

it('delegates review gate verification to the workflow aggregate', () => {
  const workflow = configureWorkflow({}).buildWorkflow(WorkflowState.initial(), {
    runLocalVerification: () => undefined,
    getGitInfo: () => ({
      currentBranch: 'main',
      workingTreeClean: true,
      defaultBranch: 'main',
      headCommit: 'b'.repeat(40),
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
      headRevision: 'b'.repeat(40),
      checks: [{ name: 'main', status: 'passed', detailsUrl: null }],
    }),
    createPullRequest: () => ({
      prNumber: 1,
      prUrl: 'https://github.com/example/repo/pull/1',
      isDraft: false,
      repository: 'example/repo',
      baseRevision: 'a'.repeat(40),
      headRevision: 'b'.repeat(40),
    }),
    listSessionReviews: () => [],
    sleepMs: () => undefined,
    now: () => '2026-01-01T00:00:00Z',
  })
  const verifyPrReviewGate = vi.spyOn(workflow, 'verifyPrReviewGate')
  new VerifyPrReviewGate(workflow).execute({})
  expect(verifyPrReviewGate).toHaveBeenCalledOnce()
})
