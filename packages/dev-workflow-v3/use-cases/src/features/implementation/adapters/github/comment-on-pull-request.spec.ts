import { describe, expect, it } from 'vitest'
import { fakeCommands } from '../../../../infra/external-clients/process/__fixtures__/command-test-fixtures'
import { commentOnPullRequestWithGithub } from './comment-on-pull-request'

describe('commentOnPullRequestWithGithub', () => {
  it('posts the comment through gh', async () => {
    const runCommand = fakeCommands([{ stdout: '', stderr: '', exitCode: 0 }])

    await commentOnPullRequestWithGithub({ runCommand, workingDirectory: '/repo' })({
      pullRequestNumber: 549,
      body: 'Ready for a person.',
    })

    expect(runCommand.requests[0]?.arguments).toStrictEqual([
      'pr',
      'comment',
      '549',
      '--body',
      'Ready for a person.',
    ])
  })
})
