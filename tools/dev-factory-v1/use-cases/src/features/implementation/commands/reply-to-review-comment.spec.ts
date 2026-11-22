import { describe, expect, it } from 'vitest'
import { ReplyToReviewComment } from './reply-to-review-comment'

describe('ReplyToReviewComment', () => {
  it('replies on the review comment', async () => {
    const replies: string[] = []
    const command = new ReplyToReviewComment(async (request) => {
      replies.push(`${request.pullRequestNumber}:${request.commentId}:${request.body}`)
    })

    const result = await command.execute({ pullRequestNumber: 551, commentId: 4306, body: 'Done.' })

    expect(result).toStrictEqual({ commentId: 4306 })
    expect(replies).toStrictEqual(['551:4306:Done.'])
  })
})
