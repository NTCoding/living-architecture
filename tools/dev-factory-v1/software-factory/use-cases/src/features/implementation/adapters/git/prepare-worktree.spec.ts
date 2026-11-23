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
      { stdout: 'origin/main\n', stderr: '', exitCode: 0 },
      { stdout: '', stderr: '', exitCode: 1 },
      { stdout: '', stderr: '', exitCode: 0 },
    ])

    await prepareWorktreeWithGit({
      runCommand,
      repositoryPath: '/repo',
      worktreesDirectory: '/worktrees',
    })(request)

    expect(runCommand.requests[1]?.arguments).toStrictEqual([
      'symbolic-ref',
      'refs/remotes/origin/HEAD',
      '--short',
    ])
    expect(runCommand.requests[2]?.arguments).toStrictEqual([
      'show-ref',
      '--verify',
      '--quiet',
      'refs/heads/issue-455-add-it',
    ])
    expect(runCommand.requests[3]?.arguments).toStrictEqual([
      'worktree',
      'add',
      '-b',
      'issue-455-add-it',
      '/worktrees/issue-455-add-it',
      'origin/main',
    ])
  })

  it('reuses a worktree that is already there, so a retry carries on', async () => {
    const runCommand = fakeCommands([
      { stdout: 'worktree /worktrees/issue-455-add-it\n', stderr: '', exitCode: 0 },
      { stdout: '', stderr: '', exitCode: 0 },
      { stdout: '', stderr: '', exitCode: 0 },
    ])

    await prepareWorktreeWithGit({
      runCommand,
      repositoryPath: '/repo',
      worktreesDirectory: '/worktrees',
    })(request)

    expect(runCommand.requests[1]?.arguments).toStrictEqual(['fetch', 'origin', 'issue-455-add-it'])
    expect(runCommand.requests[2]?.arguments).toStrictEqual([
      'log',
      '--oneline',
      'HEAD..origin/issue-455-add-it',
    ])
    expect(runCommand.requests).toHaveLength(3)
  })

  it('rebases a kept worktree onto its remote when the remote moved ahead', async () => {
    const runCommand = fakeCommands([
      { stdout: 'worktree /worktrees/issue-455-add-it\n', stderr: '', exitCode: 0 },
      { stdout: '', stderr: '', exitCode: 0 },
      { stdout: 'abc123 the remote commit\n', stderr: '', exitCode: 0 },
      { stdout: '', stderr: '', exitCode: 0 },
    ])

    await prepareWorktreeWithGit({
      runCommand,
      repositoryPath: '/repo',
      worktreesDirectory: '/worktrees',
    })(request)

    expect(runCommand.requests[3]?.arguments).toStrictEqual(['rebase', 'origin/issue-455-add-it'])
  })

  it('attaches to a branch that already exists', async () => {
    const runCommand = fakeCommands([
      { stdout: 'worktree /repo\n', stderr: '', exitCode: 0 },
      { stdout: 'origin/main\n', stderr: '', exitCode: 0 },
      { stdout: '', stderr: '', exitCode: 0 },
      { stdout: '', stderr: '', exitCode: 0 },
      { stdout: '', stderr: '', exitCode: 0 },
      { stdout: '', stderr: '', exitCode: 0 },
    ])

    await prepareWorktreeWithGit({
      runCommand,
      repositoryPath: '/repo',
      worktreesDirectory: '/worktrees',
    })(request)

    expect(runCommand.requests[3]?.arguments).toStrictEqual([
      'worktree',
      'add',
      '/worktrees/issue-455-add-it',
      'issue-455-add-it',
    ])
  })

  it('carries on without rebasing when the remote branch is missing', async () => {
    const runCommand = fakeCommands([
      { stdout: 'worktree /worktrees/issue-455-add-it\n', stderr: '', exitCode: 0 },
      { stdout: '', stderr: "fatal: couldn't find remote ref issue-455-add-it", exitCode: 1 },
    ])

    await prepareWorktreeWithGit({
      runCommand,
      repositoryPath: '/repo',
      worktreesDirectory: '/worktrees',
    })(request)

    expect(runCommand.requests).toHaveLength(2)
  })

  it('fails when the fetch fails for another reason', async () => {
    const runCommand = fakeCommands([
      { stdout: 'worktree /worktrees/issue-455-add-it\n', stderr: '', exitCode: 0 },
      { stdout: '', stderr: 'fatal: Authentication failed', exitCode: 128 },
    ])

    await expect(
      prepareWorktreeWithGit({
        runCommand,
        repositoryPath: '/repo',
        worktreesDirectory: '/worktrees',
      })(request),
    ).rejects.toThrow('The fetch of origin/issue-455-add-it failed: fatal: Authentication failed')
  })

  it('fails when git cannot create the worktree', async () => {
    const runCommand = fakeCommands([
      { stdout: 'worktree /repo\n', stderr: '', exitCode: 0 },
      { stdout: 'origin/main\n', stderr: '', exitCode: 0 },
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
