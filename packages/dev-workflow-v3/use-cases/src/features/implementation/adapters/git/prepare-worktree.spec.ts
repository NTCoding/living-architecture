import { describe, expect, it } from 'vitest'
import { fakeCommands } from '../../../../infra/external-clients/process/__fixtures__/command-test-fixtures'
import { prepareWorktreeWithGit } from './prepare-worktree'

const request = {
  worktreePath: '/worktrees/issue-455-add-it',
  branch: 'issue-455-add-it',
}

describe('prepareWorktreeWithGit', () => {
  it('creates the branch and the worktree when neither exists', async () => {
    const runCommand = fakeCommands([
      { stdout: 'worktree /repo\n', stderr: '', exitCode: 0 },
      { stdout: '', stderr: '', exitCode: 1 },
      { stdout: '', stderr: '', exitCode: 0 },
    ])

    await prepareWorktreeWithGit({
      runCommand,
      repositoryPath: '/repo',
      worktreesDirectory: '/worktrees',
    })(request)

    expect(runCommand.requests[1]?.arguments).toStrictEqual([
      'show-ref',
      '--verify',
      '--quiet',
      'refs/heads/issue-455-add-it',
    ])
    expect(runCommand.requests[2]?.arguments).toStrictEqual([
      'worktree',
      'add',
      '-b',
      'issue-455-add-it',
      '/worktrees/issue-455-add-it',
      'HEAD',
    ])
  })

  it('reuses a worktree that is already there, so a retry carries on', async () => {
    const runCommand = fakeCommands([
      { stdout: 'worktree /worktrees/issue-455-add-it\n', stderr: '', exitCode: 0 },
    ])

    await prepareWorktreeWithGit({
      runCommand,
      repositoryPath: '/repo',
      worktreesDirectory: '/worktrees',
    })(request)

    expect(runCommand.requests).toHaveLength(1)
  })

  it('attaches to a branch that already exists', async () => {
    const runCommand = fakeCommands([
      { stdout: 'worktree /repo\n', stderr: '', exitCode: 0 },
      { stdout: '', stderr: '', exitCode: 0 },
      { stdout: '', stderr: '', exitCode: 0 },
    ])

    await prepareWorktreeWithGit({
      runCommand,
      repositoryPath: '/repo',
      worktreesDirectory: '/worktrees',
    })(request)

    expect(runCommand.requests[2]?.arguments).toStrictEqual([
      'worktree',
      'add',
      '/worktrees/issue-455-add-it',
      'issue-455-add-it',
    ])
  })

  it('fails when git cannot create the worktree', async () => {
    const runCommand = fakeCommands([
      { stdout: 'worktree /repo\n', stderr: '', exitCode: 0 },
      { stdout: '', stderr: '', exitCode: 1 },
      { stdout: '', stderr: 'already exists', exitCode: 128 },
    ])

    await expect(
      prepareWorktreeWithGit({
        runCommand,
        repositoryPath: '/repo',
        worktreesDirectory: '/worktrees',
      })(request),
    ).rejects.toThrow('already exists')
  })
})
