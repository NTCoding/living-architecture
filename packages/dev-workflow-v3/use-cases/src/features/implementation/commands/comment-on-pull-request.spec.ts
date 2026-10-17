import { describe, expect, it } from 'vitest'
import { CommentOnPullRequest } from './comment-on-pull-request'
import { pullRequest, StubFailure } from './__fixtures__/command-test-fixtures'

describe('CommentOnPullRequest', () => {
  it('comments on the pull request', async () => {
    const comments: string[] = []
    const command = new CommentOnPullRequest(async (request) => {
      comments.push(`${request.pullRequestNumber}: ${request.body}`)
    })

    const result = await command.execute({ pullRequest, body: 'Ready for a person.' })

    expect(result.pullRequestNumber).toBe(549)
    expect(comments).toStrictEqual(['549: Ready for a person.'])
  })

  it('fails when the comment cannot be posted', async () => {
    const command = new CommentOnPullRequest(async () => {
      throw new StubFailure('not logged in')
    })

    await expect(command.execute({ pullRequest, body: 'Ready.' })).rejects.toThrow('not logged in')
  })
})
