import { describe, expect, it, vi } from 'vitest'
import { createGithubPullRequestClient } from './create-pull-request'

describe('createGithubPullRequestClient', () => {
  it('creates pull request from the URL returned by gh', () => {
    const calls: Array<readonly string[]> = []
    const operationOrder: string[] = []
    const pushBranch = vi.fn(() => operationOrder.push('push'))
    const createPullRequest = createGithubPullRequestClient((args) => {
      calls.push(args)
      operationOrder.push('gh')
      if (args[1] === 'create') {
        return 'https://github.com/example/repo/pull/123\n'
      }
      return JSON.stringify({
        number: 123,
        url: 'https://github.com/example/repo/pull/123',
        isDraft: false,
      })
    }, pushBranch)

    const pullRequest = createPullRequest({
      branch: 'issue-42',
      title: 'Ready PR',
      body: '## Description\n\nCreates a ready PR.',
    })

    expect(pullRequest).toStrictEqual({
      prNumber: 123,
      prUrl: 'https://github.com/example/repo/pull/123',
      isDraft: false,
    })
    expect(calls).toStrictEqual([
      ['pr', 'create', '--title', 'Ready PR', '--body', '## Description\n\nCreates a ready PR.'],
      ['pr', 'view', 'https://github.com/example/repo/pull/123', '--json', 'number,url,isDraft'],
    ])
    expect(pushBranch).toHaveBeenCalledWith('issue-42')
    expect(operationOrder).toStrictEqual(['push', 'gh', 'gh'])
  })

  it('returns draft status without changing pull request readiness', () => {
    const calls: Array<readonly string[]> = []
    const pushBranch = vi.fn()
    const createPullRequest = createGithubPullRequestClient((args) => {
      calls.push(args)
      if (args[1] === 'create') {
        return 'https://github.com/example/repo/pull/123\n'
      }
      return JSON.stringify({
        number: 123,
        url: 'https://github.com/example/repo/pull/123',
        isDraft: true,
      })
    }, pushBranch)

    const pullRequest = createPullRequest({
      branch: 'issue-42',
      title: 'Ready PR',
      body: '## Description\n\nCreates a ready PR.',
    })

    expect(pullRequest).toStrictEqual({
      prNumber: 123,
      prUrl: 'https://github.com/example/repo/pull/123',
      isDraft: true,
    })
    expect(calls).toStrictEqual([
      ['pr', 'create', '--title', 'Ready PR', '--body', '## Description\n\nCreates a ready PR.'],
      ['pr', 'view', 'https://github.com/example/repo/pull/123', '--json', 'number,url,isDraft'],
    ])
    expect(pushBranch).toHaveBeenCalledWith('issue-42')
  })

  it('throws when create command returns empty output', () => {
    const createPullRequest = createGithubPullRequestClient(
      () => '',
      () => undefined,
    )

    expect(() =>
      createPullRequest({
        branch: 'issue-42',
        title: 'Ready PR',
        body: '## Description\n\nCreates a ready PR.',
      }),
    ).toThrow('Expected gh pr create to return a URL. Got empty output.')
  })

  it('throws when create command returns an invalid URL', () => {
    const createPullRequest = createGithubPullRequestClient(
      () => 'not-json',
      () => undefined,
    )

    expect(() =>
      createPullRequest({
        branch: 'issue-42',
        title: 'Ready PR',
        body: '## Description\n\nCreates a ready PR.',
      }),
    ).toThrow('Expected gh pr create to return a URL. Got: not-json')
  })
})
