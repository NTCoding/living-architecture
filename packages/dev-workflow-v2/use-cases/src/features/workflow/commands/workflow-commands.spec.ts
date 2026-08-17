import { Workflow } from '@living-architecture/dev-workflow-v2-domain-model/domain/workflow'
import { getInitialWorkflowState } from '@living-architecture/dev-workflow-v2-domain-model/domain/workflow-types'
import { CreatePullRequest } from './create-pull-request'
import { RecordBranch } from './record-branch'
import { RecordCiFailed } from './record-ci-failed'
import { RecordCiPassed } from './record-ci-passed'
import { RecordIssue } from './record-issue'
import { RecordPullRequest } from './record-pull-request'
import { VerifyFeedbackAddressed } from './verify-feedback-addressed'

type WorkflowDeps = Parameters<typeof Workflow.rehydrate>[1]

function workflow(): Workflow {
  const deps: WorkflowDeps = {
    getGitInfo: () => ({
      currentBranch: 'feature/test',
      workingTreeClean: true,
      headCommit: 'abc123',
      changedFilesVsDefault: [],
      hasCommitsVsDefault: true,
    }),
    getPrFeedback: () => ({
      reviewDecision: null,
      coderabbitReviewSeen: true,
      unresolvedCount: 0,
      threads: [],
    }),
    createPullRequest: () => ({
      prNumber: 42,
      prUrl: 'https://github.com/example/repo/pull/42',
      isDraft: false,
    }),
    listSessionReviews: () => [],
    sleepMs: () => undefined,
    now: () => '2026-01-01T00:00:00Z',
  }
  return Workflow.rehydrate(getInitialWorkflowState(), deps)
}

describe('workflow commands', () => {
  it('creates a pull request', () => {
    expect(new CreatePullRequest(workflow()).execute({ arguments: [] })).toHaveProperty('result')
  })

  it('records a branch', () => {
    expect(new RecordBranch(workflow()).execute({ branch: 'feature/test' })).toHaveProperty(
      'result',
    )
  })

  it('records failed CI', () => {
    expect(new RecordCiFailed(workflow()).execute({ output: 'failed' })).toHaveProperty('result')
  })

  it('records passed CI', () => {
    expect(new RecordCiPassed(workflow()).execute({})).toHaveProperty('result')
  })

  it('records an issue', () => {
    expect(new RecordIssue(workflow()).execute({ issueNumber: 42 })).toHaveProperty('result')
  })

  it('records a pull request', () => {
    expect(
      new RecordPullRequest(workflow()).execute({
        number: 42,
        url: 'https://github.com/example/repo/pull/42',
      }),
    ).toHaveProperty('result')
  })

  it('verifies addressed feedback', () => {
    expect(new VerifyFeedbackAddressed(workflow()).execute({})).toHaveProperty('result')
  })
})
