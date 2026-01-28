import {
  describe, it, expect 
} from 'vitest'

import {
  runWorkflow,
  workflow,
  WorkflowError,
  completeTaskContextSchema,
  getPRFeedbackContextSchema,
  MissingPullRequestDetailsError,
  AgentError,
  ConventionalCommitTitle,
  ClaudeQueryError,
  GitError,
  GitHubError,
} from './index'

describe('shell/index exports', () => {
  it('exports workflow execution utilities', () => {
    expect(typeof runWorkflow).toBe('function')
    expect(typeof workflow).toBe('function')
    expect(new WorkflowError('test').name).toBe('WorkflowError')
  })

  it('exports Zod schemas that parse valid input', () => {
    const completeTaskInput = {
      branch: 'test-branch',
      reviewDir: '/reviews/test',
      hasIssue: true,
      issueNumber: 123,
      commitMessage: 'feat: test',
      prTitle: 'feat: test',
      prBody: 'Test body',
    }
    expect(() => completeTaskContextSchema.parse(completeTaskInput)).not.toThrow()

    const feedbackInput = {
      branch: 'test-branch',
      includeResolved: false,
    }
    expect(() => getPRFeedbackContextSchema.parse(feedbackInput)).not.toThrow()
  })

  it('exports domain error classes that can be instantiated', () => {
    expect(new MissingPullRequestDetailsError().name).toBe('MissingPullRequestDetailsError')
    expect(new AgentError('test').name).toBe('AgentError')
    expect(ConventionalCommitTitle.parse('feat: test').toString()).toBe('feat: test')
  })

  it('exports infrastructure error classes that can be instantiated', () => {
    expect(new ClaudeQueryError('test').name).toBe('ClaudeQueryError')
    expect(new GitError('test').name).toBe('GitError')
    expect(new GitHubError('test').name).toBe('GitHubError')
  })
})
