import { describe, expect, it } from 'vitest'
import { createGithubReviewComment } from './review-comment'
import { fakeCommands, failingCommand } from '../process/__fixtures__/command-test-fixtures'

describe('createGithubReviewComment', () => {
  it('posts one review comment and returns its id', async () => {
    const runCommand = fakeCommands([{ stdout: '{"id":991}', stderr: '', exitCode: 0 }])

    const commentId = await createGithubReviewComment(runCommand, {
      workingDirectory: '/worktree',
      pullRequestNumber: 549,
      comment: { path: 'src/order.ts', line: 12, body: '**SD-005** A rule.' },
    })

    expect(commentId).toBe(991)
    expect(runCommand.requests[0]?.arguments).toContain('repos/{owner}/{repo}/pulls/549/comments')
  })

  it('fails when the comment cannot be posted', async () => {
    await expect(
      createGithubReviewComment(failingCommand('line is not part of the diff'), {
        workingDirectory: '/worktree',
        pullRequestNumber: 549,
        comment: { path: 'src/order.ts', line: 12, body: 'A rule.' },
      }),
    ).rejects.toThrow('line is not part of the diff')
  })
})
