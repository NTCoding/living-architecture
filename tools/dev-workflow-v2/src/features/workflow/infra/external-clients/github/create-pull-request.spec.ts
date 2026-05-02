import {
  describe, expect, it 
} from 'vitest'
import { createPullRequestCreator } from './create-pull-request'

describe('createPullRequestCreator', () => {
  it('returns ready pull request when GitHub creates ready pull request', () => {
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

    const pullRequest = createPullRequest(['--title', 'Ready PR'])

    expect(pullRequest).toStrictEqual({
      prNumber: 123,
      prUrl: 'https://github.com/example/repo/pull/123',
      isDraft: false,
    })
    expect(calls).toStrictEqual([
      "'pr' 'create' '--title' 'Ready PR'",
      "'pr' 'view' 'https://github.com/example/repo/pull/123' '--json' 'number,url,isDraft'",
    ])
  })

  it('marks pull request ready when GitHub creates draft pull request', () => {
    const calls: string[] = []
    const createPullRequest = createPullRequestCreator((args) => {
      calls.push(args)
      if (args.startsWith("'pr' 'create'")) {
        return 'https://github.com/example/repo/pull/123\n'
      }
      if (args.startsWith("'pr' 'ready'")) {
        return ''
      }
      const viewCount = calls.filter((call) => call.startsWith("'pr' 'view'")).length
      return JSON.stringify({
        number: 123,
        url: 'https://github.com/example/repo/pull/123',
        isDraft: viewCount === 1,
      })
    })

    const pullRequest = createPullRequest(['--title', 'Ready PR'])

    expect(pullRequest).toStrictEqual({
      prNumber: 123,
      prUrl: 'https://github.com/example/repo/pull/123',
      isDraft: false,
    })
    expect(calls).toStrictEqual([
      "'pr' 'create' '--title' 'Ready PR'",
      "'pr' 'view' 'https://github.com/example/repo/pull/123' '--json' 'number,url,isDraft'",
      "'pr' 'ready' '123'",
      "'pr' 'view' '123' '--json' 'number,url,isDraft'",
    ])
  })

  it('throws when pull request remains draft after ready command', () => {
    const createPullRequest = createPullRequestCreator((args) => {
      if (args.startsWith("'pr' 'create'")) {
        return 'https://github.com/example/repo/pull/123\n'
      }
      if (args.startsWith("'pr' 'ready'")) {
        return ''
      }
      return JSON.stringify({
        number: 123,
        url: 'https://github.com/example/repo/pull/123',
        isDraft: true,
      })
    })

    expect(() => createPullRequest(['--title', 'Ready PR'])).toThrow(
      'Expected PR #123 to be ready for review. Got draft PR.',
    )
  })

  it('throws when create command returns empty output', () => {
    const createPullRequest = createPullRequestCreator(() => '')

    expect(() => createPullRequest(['--title', 'Ready PR'])).toThrow(
      'Expected gh pr create to print a pull request URL. Got empty output.',
    )
  })
})
