import { describe, expect, it } from 'vitest'
import { fakeCommands } from '../../../../infra/external-clients/process/__fixtures__/command-test-fixtures'
import { publishReviewFindingWithGithub } from './publish-review-finding'

describe('publishReviewFindingWithGithub', () => {
  it('posts the finding as a review comment', async () => {
    const runCommand = fakeCommands([{ stdout: '{"id":991}', stderr: '', exitCode: 0 }])

    const posted = await publishReviewFindingWithGithub({ runCommand, workingDirectory: '/repo' })({
      pullRequestNumber: 549,
      comment: { path: 'src/order.ts', line: 12, body: 'A rule.' },
    })

    expect(posted).toStrictEqual({ commentId: 991 })
  })
})
