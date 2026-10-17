import { describe, expect, it } from 'vitest'
import { fakeCommands } from '../../../infra/external-clients/process/__fixtures__/command-test-fixtures'
import { prepareWorktreeWithGit } from '../adapters/git/prepare-worktree'
import { PrepareBranch } from './prepare-branch'
import { issue, StubFailure } from './__fixtures__/command-test-fixtures'

describe('PrepareBranch', () => {
  it('derives the branch from the issue title and creates the worktree', async () => {
    const runCommand = fakeCommands([
      { stdout: '', stderr: '', exitCode: 0 },
      { stdout: '', stderr: '', exitCode: 0 },
    ])
    const command = new PrepareBranch(
      prepareWorktreeWithGit({
        runCommand,
        repositoryPath: '/repo',
        worktreesDirectory: '/worktrees',
      }),
    )

    const result = await command.execute({ issue, worktreesDirectory: '/worktrees' })

    expect(result.worktree.path()).toBe('/worktrees/issue-455-add-a-review-cycle')
    expect(result.worktree.branch()).toBe('issue-455-add-a-review-cycle')
  })

  it('fails when the worktree cannot be created', async () => {
    const command = new PrepareBranch(async () => {
      throw new StubFailure('the branch already exists')
    })

    await expect(command.execute({ issue, worktreesDirectory: '/worktrees' })).rejects.toThrow(
      'the branch already exists',
    )
  })
})
