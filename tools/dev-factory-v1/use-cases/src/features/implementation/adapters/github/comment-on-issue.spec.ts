import { describe, expect, it } from 'vitest'
import { fakeCommands } from '../../../../infra/external-clients/process/__fixtures__/command-test-fixtures'
import { commentOnIssueWithGithub } from './comment-on-issue'

describe('commentOnIssueWithGithub', () => {
  it('posts the comment and returns when it was created', async () => {
    const runCommand = fakeCommands([
      { stdout: '{"id":991,"created_at":"2026-10-18T10:00:00Z"}', stderr: '', exitCode: 0 },
    ])

    const posted = await commentOnIssueWithGithub({ runCommand, workingDirectory: '/repo' })({
      issueNumber: 500,
      body: '## Plan',
    })

    expect(posted).toStrictEqual({ commentId: 991, createdAt: '2026-10-18T10:00:00Z' })
    expect(runCommand.requests[0]?.arguments).toContain('repos/{owner}/{repo}/issues/500/comments')
  })
})
