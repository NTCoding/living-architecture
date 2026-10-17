import { describe, expect, it } from 'vitest'
import { fakeCommands } from '../../../../infra/external-clients/process/__fixtures__/command-test-fixtures'
import { openPullRequestWithGithub } from './open-pull-request'

describe('openPullRequestWithGithub', () => {
  it('creates the pull request from the worktree', async () => {
    const runCommand = fakeCommands([
      { stdout: '{"number":549,"url":"https://github.com/o/r/pull/549"}', stderr: '', exitCode: 0 },
    ])

    const created = await openPullRequestWithGithub({ runCommand })({
      worktreePath: '/worktree',
      branch: 'issue-455-add-it',
      title: 'feat: add it',
      body: 'The description.',
    })

    expect(created).toStrictEqual({ number: 549, url: 'https://github.com/o/r/pull/549' })
    expect(runCommand.requests[0]?.workingDirectory).toBe('/worktree')
  })
})
