import { describe, expect, it } from 'vitest'
import { fakeCommands } from '../../../../infra/external-clients/process/__fixtures__/command-test-fixtures'
import { prepareWorktreeWithGit } from './prepare-worktree'

describe('prepareWorktreeWithGit', () => {
  it('creates the branch and the worktree', async () => {
    const runCommand = fakeCommands([
      { stdout: '', stderr: '', exitCode: 0 },
      { stdout: '/worktrees/issue-455-add-it', stderr: '', exitCode: 0 },
    ])

    await prepareWorktreeWithGit({
      runCommand,
      repositoryPath: '/repo',
      worktreesDirectory: '/worktrees',
    })({ worktreePath: '/worktrees/issue-455-add-it', branch: 'issue-455-add-it' })

    expect(runCommand.requests[0]?.arguments).toStrictEqual([
      'worktree',
      'add',
      '-b',
      'issue-455-add-it',
      '/worktrees/issue-455-add-it',
      'HEAD',
    ])
    expect(runCommand.requests[1]?.arguments).toStrictEqual(['worktree', 'list'])
  })

  it('fails when git cannot create the worktree', async () => {
    const runCommand = fakeCommands([{ stdout: '', stderr: 'already exists', exitCode: 128 }])

    await expect(
      prepareWorktreeWithGit({
        runCommand,
        repositoryPath: '/repo',
        worktreesDirectory: '/worktrees',
      })({ worktreePath: '/worktrees/issue-455-add-it', branch: 'issue-455-add-it' }),
    ).rejects.toThrow('already exists')
  })
})
