import { describe, expect, it } from 'vitest'
import { CommentOnIssue } from './comment-on-issue'
import { StubFailure } from './__fixtures__/command-test-fixtures'

describe('CommentOnIssue', () => {
  it('comments on the issue', async () => {
    const comments: string[] = []
    const command = new CommentOnIssue(async (request) => {
      comments.push(`${request.issueNumber}: ${request.body}`)
      return { commentId: 991, createdAt: '2026-10-18T10:00:00Z' }
    })

    const result = await command.execute({ issueNumber: 548, body: '## Plan' })

    expect(result).toStrictEqual({
      issueNumber: 548,
      commentId: 991,
      createdAt: '2026-10-18T10:00:00Z',
    })
    expect(comments).toStrictEqual(['548: ## Plan'])
  })

  it('fails when the comment cannot be posted', async () => {
    const command = new CommentOnIssue(async () => {
      throw new StubFailure('not logged in')
    })

    await expect(command.execute({ issueNumber: 548, body: '## Plan' })).rejects.toThrow(
      'not logged in',
    )
  })
})
