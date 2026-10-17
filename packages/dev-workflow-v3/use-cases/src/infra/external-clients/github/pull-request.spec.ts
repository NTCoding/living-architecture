import { describe, expect, it } from 'vitest'
import { createGithubPullRequest } from './pull-request'
import { fakeCommands, failingCommand } from '../process/__fixtures__/command-test-fixtures'

describe('createGithubPullRequest', () => {
  it('creates the pull request for the branch and returns its number and url', async () => {
    const runCommand = fakeCommands([
      { stdout: '{"number":549,"url":"https://github.com/o/r/pull/549"}', stderr: '', exitCode: 0 },
    ])

    const created = await createGithubPullRequest(runCommand, {
      workingDirectory: '/worktree',
      branch: 'issue-455-add-it',
      title: 'feat: add it',
      body: 'The description.',
    })

    expect(created).toStrictEqual({ number: 549, url: 'https://github.com/o/r/pull/549' })
    expect(runCommand.requests[0]?.arguments).toStrictEqual([
      'pr',
      'create',
      '--title',
      'feat: add it',
      '--body',
      'The description.',
      '--head',
      'issue-455-add-it',
      '--json',
      'number,url',
    ])
  })

  it('fails when gh reports that the pull request exists', async () => {
    await expect(
      createGithubPullRequest(failingCommand('a pull request already exists'), {
        workingDirectory: '/worktree',
        branch: 'issue-455-add-it',
        title: 'feat: add it',
        body: 'The description.',
      }),
    ).rejects.toThrow('a pull request already exists')
  })
})
