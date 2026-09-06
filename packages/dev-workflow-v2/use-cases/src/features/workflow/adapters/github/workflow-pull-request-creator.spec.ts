import { expect, it, vi } from 'vitest'
import { createWorkflowPullRequestCreator } from './workflow-pull-request-creator'

it('translates workflow pull request details into a GitHub request', () => {
  const client = vi.fn(() => ({
    isDraft: false,
    repository: 'example/repository',
    baseRevision: 'a'.repeat(40),
    headRevision: 'b'.repeat(40),
    prNumber: 42,
    prUrl: 'https://github.com/example/repository/pull/42',
  }))
  const createPullRequest = createWorkflowPullRequestCreator(client)

  const result = createPullRequest({
    branch: 'issue-42',
    body: 'Description',
    title: 'Example change',
  })

  expect(client).toHaveBeenCalledWith({
    branch: 'issue-42',
    body: 'Description',
    title: 'Example change',
  })
  expect(result).toStrictEqual({
    isDraft: false,
    repository: 'example/repository',
    baseRevision: 'a'.repeat(40),
    headRevision: 'b'.repeat(40),
    prNumber: 42,
    prUrl: 'https://github.com/example/repository/pull/42',
  })
})
