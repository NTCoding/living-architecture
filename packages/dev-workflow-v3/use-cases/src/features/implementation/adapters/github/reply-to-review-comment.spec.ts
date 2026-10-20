import { describe, expect, it } from 'vitest'
import { fakeCommands } from '../../../../infra/external-clients/process/__fixtures__/command-test-fixtures'
import { replyToReviewCommentWithGithub } from './reply-to-review-comment'

describe('replyToReviewCommentWithGithub', () => {
  it('posts the reply on the comment thread', async () => {
    const runCommand = fakeCommands([{ stdout: '', stderr: '', exitCode: 0 }])

    await replyToReviewCommentWithGithub({ runCommand, workingDirectory: '/repo' })({
      pullRequestNumber: 551,
      commentId: 4306,
      body: '[dev-workflow-v3] Addressed.',
    })

    expect(runCommand.requests[0]?.arguments).toContain(
      'repos/{owner}/{repo}/pulls/551/comments/4306/replies',
    )
  })
})
