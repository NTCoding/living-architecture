import { describe, expect, it } from 'vitest'
import { createGithubPullRequestCommentClient } from './post-pull-request-comment'

describe('createGithubPullRequestCommentClient', () => {
  it('posts an ordinary pull request comment to the current repository', () => {
    const calls: string[][] = []
    const runGh = (argumentsList: readonly string[]) => {
      calls.push([...argumentsList])
      return JSON.stringify({ owner: { login: 'example' }, name: 'repository' })
    }

    createGithubPullRequestCommentClient(runGh)(42, 'notice')

    expect(calls).toStrictEqual([
      ['repo', 'view', '--json', 'owner,name'],
      [
        'api',
        '--method',
        'POST',
        'repos/example/repository/issues/42/comments',
        '-f',
        'body=notice',
      ],
    ])
  })

  it('rejects malformed repository responses', () => {
    expect(() => createGithubPullRequestCommentClient(() => '{}')(42, 'notice')).toThrow(/Required/)
  })
})
