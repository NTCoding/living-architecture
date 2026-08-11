import {
  describe, expect, it 
} from 'vitest'
import { createGithubPullRequestClient } from './index'

describe('createGithubPullRequestClient', () => {
  it('creates pull request from structured title and body', () => {
    const calls: Array<readonly string[]> = []
    const createPullRequest = createGithubPullRequestClient((args) => {
      calls.push(args)
      if (args[1] === 'create') {
        return JSON.stringify({ url: 'https://github.com/example/repo/pull/123' })
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
      [
        'pr',
        'create',
        '--title',
        'Ready PR',
        '--body',
        '## Description\n\nCreates a ready PR.',
        '--json',
        'url',
      ],
      ['pr', 'view', 'https://github.com/example/repo/pull/123', '--json', 'number,url,isDraft'],
    ])
  })

  it('returns draft status without changing pull request readiness', () => {
    const calls: Array<readonly string[]> = []
    const createPullRequest = createGithubPullRequestClient((args) => {
      calls.push(args)
      if (args[1] === 'create') {
        return JSON.stringify({ url: 'https://github.com/example/repo/pull/123' })
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
      [
        'pr',
        'create',
        '--title',
        'Ready PR',
        '--body',
        '## Description\n\nCreates a ready PR.',
        '--json',
        'url',
      ],
      ['pr', 'view', 'https://github.com/example/repo/pull/123', '--json', 'number,url,isDraft'],
    ])
  })

  it('throws when create command returns empty output', () => {
    const createPullRequest = createGithubPullRequestClient(() => '')

    expect(() =>
      createPullRequest({
        title: 'Ready PR',
        body: '## Description\n\nCreates a ready PR.',
      }),
    ).toThrow('Expected gh pr create to return JSON with a url field. Got empty output.')
  })

  it('throws when create command returns non-json output', () => {
    const createPullRequest = createGithubPullRequestClient(() => 'not-json')

    expect(() =>
      createPullRequest({
        title: 'Ready PR',
        body: '## Description\n\nCreates a ready PR.',
      }),
    ).toThrow('Expected gh pr create to return JSON with a url field. Got: not-json')
  })

  it('throws when create command returns json without a url', () => {
    const createPullRequest = createGithubPullRequestClient(() => JSON.stringify({}))

    expect(() =>
      createPullRequest({
        title: 'Ready PR',
        body: '## Description\n\nCreates a ready PR.',
      }),
    ).toThrow('Expected gh pr create to return JSON with a url field. Got: {}')
  })
})
