import { describe, expect, it } from 'vitest'
import { PostedReviewFinding } from './posted-review-finding'
import { reviewFinding } from './__fixtures__/review-test-fixtures'

describe('PostedReviewFinding', () => {
  it('keeps the finding and the comment id it was posted as', () => {
    const posted = PostedReviewFinding.from(reviewFinding(), 991)

    expect(posted.finding().file()).toBe('src/order.ts')
    expect(posted.commentId()).toBe(991)
  })

  it('rejects a comment id that is not positive', () => {
    expect(() => PostedReviewFinding.from(reviewFinding(), 0)).toThrow(
      'Number must be greater than 0',
    )
  })
})
