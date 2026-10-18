import { describe, expect, it } from 'vitest'
import { fakeCommands } from '../../../../infra/external-clients/process/__fixtures__/command-test-fixtures'
import { commentOnIssueWithGithub } from './comment-on-issue'

describe('commentOnIssueWithGithub', () => {
  it('posts the comment on the issue', async () => {
    const runCommand = fakeCommands([{ stdout: '', stderr: '', exitCode: 0 }])

    await commentOnIssueWithGithub({ runCommand, workingDirectory: '/repo' })({
      issueNumber: 548,
      body: '## Plan',
    })

    expect(runCommand.requests[0]?.arguments).toStrictEqual([
      'issue',
      'comment',
      '548',
      '--body',
      '## Plan',
    ])
  })
})
