import {
  expect, it, vi 
} from 'vitest'
import { createWorkflowPullRequestCreator } from './workflow-pull-request-creator'

it('translates workflow pull request details into a GitHub request', () => {
  const client = vi.fn(() => ({
    isDraft: false,
    prNumber: 42,
    prUrl: 'https://github.com/example/repository/pull/42',
  }))
  const createPullRequest = createWorkflowPullRequestCreator(client)

  const result = createPullRequest({
    body: 'Description',
    title: 'Example change',
  })

  expect(client).toHaveBeenCalledWith({
    body: 'Description',
    title: 'Example change',
  })
  expect(result).toStrictEqual({
    isDraft: false,
    prNumber: 42,
    prUrl: 'https://github.com/example/repository/pull/42',
  })
})
