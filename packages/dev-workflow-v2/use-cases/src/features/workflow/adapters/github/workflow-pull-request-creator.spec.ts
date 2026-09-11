import { expect, it, vi } from 'vitest'
import { createWorkflowPullRequestCreator } from './workflow-pull-request-creator'

it('pushes the branch and translates workflow pull request details into a GitHub request', () => {
  const client = vi.fn(() => ({
    prNumber: 42,
    prUrl: 'https://github.com/example/repository/pull/42',
  }))
  const pushBranch = vi.fn()
  const createPullRequest = createWorkflowPullRequestCreator(client, pushBranch)

  const result = createPullRequest({
    branch: 'issue-42',
    body: 'Description',
    title: 'Example change',
  })

  expect(pushBranch).toHaveBeenCalledWith('issue-42')
  expect(client).toHaveBeenCalledWith({
    branch: 'issue-42',
    body: 'Description',
    title: 'Example change',
    draft: false,
  })
  expect(result).toStrictEqual({
    prNumber: 42,
    prUrl: 'https://github.com/example/repository/pull/42',
  })
})
