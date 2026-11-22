import { describe, expect, it } from 'vitest'
import { createGithubReviewComment } from './review-comment'
import { fakeCommands } from '../process/__fixtures__/command-test-fixtures'

describe('createGithubReviewComment', () => {
  it('posts one review comment against the current head and returns its id', async () => {
    const runCommand = fakeCommands([
      { stdout: '{"headRefOid":"ba7946652b65"}', stderr: '', exitCode: 0 },
      { stdout: '{"id":991}', stderr: '', exitCode: 0 },
    ])

    const commentId = await createGithubReviewComment(runCommand, {
      workingDirectory: '/worktree',
      pullRequestNumber: 549,
      comment: { path: 'src/order.ts', line: 12, body: '**SD-005** A rule.' },
    })

    expect(commentId).toBe(991)
    expect(runCommand.requests[1]?.arguments).toContain('commit_id=ba7946652b65')
    expect(runCommand.requests[1]?.arguments).toContain('line=12')
  })

  it('fails when the comment cannot be posted', async () => {
    const runCommand = fakeCommands([
      { stdout: '{"headRefOid":"ba7946652b65"}', stderr: '', exitCode: 0 },
      { stdout: '', stderr: 'line is not part of the diff', exitCode: 1 },
    ])

    await expect(
      createGithubReviewComment(runCommand, {
        workingDirectory: '/worktree',
        pullRequestNumber: 549,
        comment: { path: 'src/order.ts', line: 12, body: 'A rule.' },
      }),
    ).rejects.toThrow('line is not part of the diff')
  })
})
