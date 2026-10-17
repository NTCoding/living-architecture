import { describe, expect, it } from 'vitest'
import { createGithubPullRequest } from './pull-request'
import { fakeCommands, failingCommand } from '../process/__fixtures__/command-test-fixtures'

const request = {
  workingDirectory: '/worktree',
  branch: 'issue-455-add-it',
  title: 'feat: add it',
  body: 'The description.',
}

describe('createGithubPullRequest', () => {
  it('creates the pull request for the branch and returns its number and url', async () => {
    const runCommand = fakeCommands([
      { stdout: 'https://github.com/o/r/pull/549', stderr: '', exitCode: 0 },
      { stdout: '{"number":549,"url":"https://github.com/o/r/pull/549"}', stderr: '', exitCode: 0 },
    ])

    const created = await createGithubPullRequest(runCommand, request)

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
    ])
    expect(runCommand.requests[1]?.arguments).toStrictEqual([
      'pr',
      'view',
      'issue-455-add-it',
      '--json',
      'number,url',
    ])
  })

  it('reuses the pull request that already exists for the branch', async () => {
    const runCommand = fakeCommands([
      { stdout: '', stderr: 'a pull request for branch already exists', exitCode: 1 },
      { stdout: '{"number":549,"url":"https://github.com/o/r/pull/549"}', stderr: '', exitCode: 0 },
    ])

    const created = await createGithubPullRequest(runCommand, request)

    expect(created.number).toBe(549)
  })

  it('fails when gh cannot create the pull request at all', async () => {
    await expect(createGithubPullRequest(failingCommand('not logged in'), request)).rejects.toThrow(
      'The pull request was not created: not logged in',
    )
  })
})
