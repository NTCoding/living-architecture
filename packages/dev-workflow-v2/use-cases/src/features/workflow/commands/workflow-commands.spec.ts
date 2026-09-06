import type { MaintainerWorkflow } from '@living-architecture/dev-workflow-v2-domain-model/domain/workflow'
import { CreatePullRequest } from './create-pull-request'
import { RecordBranch } from './record-branch'
import { RecordCiFailed } from './record-ci-failed'
import { RecordCiPassed } from './record-ci-passed'
import { RecordIssue } from './record-issue'
import { RecordPullRequest } from './record-pull-request'
import { VerifyFeedbackAddressed } from './verify-feedback-addressed'
import { configureWorkflow } from './configure-workflow'

const WORKFLOW_DEFINITION = configureWorkflow({})
type WorkflowDeps = Parameters<typeof WORKFLOW_DEFINITION.buildWorkflow>[1]

function workflow(): MaintainerWorkflow {
  const deps: WorkflowDeps = {
    getGitInfo: () => ({
      currentBranch: 'feature/test',
      workingTreeClean: true,
      defaultBranch: 'main',
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
      repository: 'example/repo',
      baseRevision: 'a'.repeat(40),
      headRevision: 'b'.repeat(40),
    }),
    listSessionReviews: () => [],
    sleepMs: () => undefined,
    now: () => '2026-01-01T00:00:00Z',
  }
  return WORKFLOW_DEFINITION.buildWorkflow(WORKFLOW_DEFINITION.initialState(), deps)
}

describe('workflow commands', () => {
  it('creates a pull request', () => {
    const result = new CreatePullRequest(workflow()).execute({ arguments: [] })
    expect(result).toHaveProperty('result')
    expect(typeof result.result.pass).toBe('boolean')
  })

  it('records a branch', () => {
    const result = new RecordBranch(workflow()).execute({ branch: 'feature/test' })
    expect(result).toHaveProperty('result')
    expect(typeof result.result.pass).toBe('boolean')
  })

  it('records failed CI', () => {
    const result = new RecordCiFailed(workflow()).execute({ output: 'failed' })
    expect(result).toHaveProperty('result')
    expect(typeof result.result.pass).toBe('boolean')
  })

  it('records passed CI', () => {
    const result = new RecordCiPassed(workflow()).execute({})
    expect(result).toHaveProperty('result')
    expect(typeof result.result.pass).toBe('boolean')
  })

  it('records an issue', () => {
    const result = new RecordIssue(workflow()).execute({ issueNumber: 42 })
    expect(result).toHaveProperty('result')
    expect(typeof result.result.pass).toBe('boolean')
  })

  it('records a pull request', () => {
    const result = new RecordPullRequest(workflow()).execute({
      number: 42,
      url: 'https://github.com/example/repo/pull/42',
    })
    expect(result).toHaveProperty('result')
    expect(typeof result.result.pass).toBe('boolean')
  })

  it('verifies addressed feedback', () => {
    const result = new VerifyFeedbackAddressed(workflow()).execute({})
    expect(result).toHaveProperty('result')
    expect(typeof result.result.pass).toBe('boolean')
  })
})
