import { describe, expect, it } from 'vitest'
import { PublishReviewFindings } from './publish-review-findings'
import { finding, pullRequest } from './__fixtures__/command-test-fixtures'

describe('PublishReviewFindings', () => {
  it('posts each finding and records the comment id', async () => {
    const postedBodies: string[] = []
    const command = new PublishReviewFindings(async (request) => {
      postedBodies.push(request.comment.body)
      return { commentId: 991 }
    })

    const result = await command.execute({ ...pullRequest, findings: [finding] })

    expect(postedBodies).toStrictEqual([
      '[dev-workflow-v3] [code-review] **SD-005** A domain decision sits in the adapter.',
    ])
    expect(result.posted).toStrictEqual([{ file: 'src/order.ts', line: 12, commentId: 991 }])
  })

  it('posts nothing when there are no findings', async () => {
    const command = new PublishReviewFindings(async () => ({ commentId: 1 }))

    const result = await command.execute({ ...pullRequest, findings: [] })

    expect(result.posted).toStrictEqual([])
  })
})
