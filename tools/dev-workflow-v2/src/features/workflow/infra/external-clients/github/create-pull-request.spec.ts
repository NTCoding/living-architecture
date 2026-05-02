import {
  describe, expect, it 
} from 'vitest'
import { createPullRequestCreator } from './create-pull-request'

describe('createPullRequestCreator', () => {
  it('creates pull request from structured title and body', () => {
    const calls: string[] = []
    const createPullRequest = createPullRequestCreator((args) => {
      calls.push(args)
      if (args.startsWith("'pr' 'create'")) {
        return 'https://github.com/example/repo/pull/123\n'
      }
      return JSON.stringify({
        number: 123,
        url: 'https://github.com/example/repo/pull/123',
        isDraft: false,
      })
    })

    const pullRequest = createPullRequest({
      title: 'Ready PR',
      body: '## Description\n\nCreates a ready PR.',
    })

    expect(pullRequest).toStrictEqual({
      prNumber: 123,
      prUrl: 'https://github.com/example/repo/pull/123',
      isDraft: false,
    })
    expect(calls).toStrictEqual([
      "'pr' 'create' '--title' 'Ready PR' '--body' '## Description\n\nCreates a ready PR.'",
      "'pr' 'view' 'https://github.com/example/repo/pull/123' '--json' 'number,url,isDraft'",
    ])
  })

  it('returns draft status without changing pull request readiness', () => {
    const calls: string[] = []
    const createPullRequest = createPullRequestCreator((args) => {
      calls.push(args)
      if (args.startsWith("'pr' 'create'")) {
        return 'https://github.com/example/repo/pull/123\n'
      }
      return JSON.stringify({
        number: 123,
        url: 'https://github.com/example/repo/pull/123',
        isDraft: true,
      })
    })

    const pullRequest = createPullRequest({
      title: 'Ready PR',
      body: '## Description\n\nCreates a ready PR.',
    })

    expect(pullRequest).toStrictEqual({
      prNumber: 123,
      prUrl: 'https://github.com/example/repo/pull/123',
      isDraft: true,
    })
    expect(calls).toStrictEqual([
      "'pr' 'create' '--title' 'Ready PR' '--body' '## Description\n\nCreates a ready PR.'",
      "'pr' 'view' 'https://github.com/example/repo/pull/123' '--json' 'number,url,isDraft'",
    ])
  })

  it('throws when create command returns empty output', () => {
    const createPullRequest = createPullRequestCreator(() => '')

    expect(() =>
      createPullRequest({
        title: 'Ready PR',
        body: '## Description\n\nCreates a ready PR.',
      }),
    ).toThrow('Expected gh pr create to print a pull request URL. Got empty output.')
  })
})
