import { vi } from 'vitest'
import type { MaintainerWorkflow } from '@living-architecture/dev-workflow-v2-domain-model/domain/workflow'

type WorkflowDeps = Parameters<typeof MaintainerWorkflow.build>[1]

export function makeWorkflowDeps(): WorkflowDeps {
  return {
    runLocalVerification: vi.fn<WorkflowDeps['runLocalVerification']>(),
    getGitInfo: vi.fn<WorkflowDeps['getGitInfo']>().mockReturnValue({
      currentBranch: 'main',
      workingTreeClean: true,
      defaultBranch: 'main',
      headCommit: 'b'.repeat(40),
      changedFilesVsDefault: [],
      hasCommitsVsDefault: false,
    }),
    getPrFeedback: vi.fn<WorkflowDeps['getPrFeedback']>().mockReturnValue({
      reviewDecision: null,
      coderabbitReviewSeen: true,
      unresolvedCount: 0,
      threads: [],
    }),
    getRequiredPullRequestChecks: vi
      .fn<WorkflowDeps['getRequiredPullRequestChecks']>()
      .mockReturnValue({
        headRevision: 'b'.repeat(40),
        checks: [{ name: 'main', status: 'passed', detailsUrl: null }],
      }),
    createPullRequest: vi.fn<WorkflowDeps['createPullRequest']>().mockReturnValue({
      prNumber: 1,
      prUrl: 'https://github.com/example/repo/pull/1',
      isDraft: false,
      repository: 'example/repo',
      baseRevision: 'a'.repeat(40),
      headRevision: 'b'.repeat(40),
    }),
    listSessionReviews: vi.fn<WorkflowDeps['listSessionReviews']>().mockReturnValue([]),
    sleepMs: vi.fn<WorkflowDeps['sleepMs']>(),
    now: vi.fn<WorkflowDeps['now']>().mockReturnValue('2026-01-01T00:00:00Z'),
  }
}
