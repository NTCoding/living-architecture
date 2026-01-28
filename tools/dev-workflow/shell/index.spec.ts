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
    expect(runWorkflow).toBeDefined()
    expect(workflow).toBeDefined()
    expect(WorkflowError).toBeDefined()
  })

  it('exports Zod schemas', () => {
    expect(completeTaskContextSchema).toBeDefined()
    expect(getPRFeedbackContextSchema).toBeDefined()
  })

  it('exports domain error classes', () => {
    expect(MissingPullRequestDetailsError).toBeDefined()
    expect(AgentError).toBeDefined()
    expect(ConventionalCommitTitle).toBeDefined()
  })

  it('exports infrastructure error classes', () => {
    expect(ClaudeQueryError).toBeDefined()
    expect(GitError).toBeDefined()
    expect(GitHubError).toBeDefined()
  })
})
