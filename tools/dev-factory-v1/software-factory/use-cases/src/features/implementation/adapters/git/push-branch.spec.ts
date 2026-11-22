import { describe, expect, it } from 'vitest'
import { fakeCommands } from '../../../../infra/external-clients/process/__fixtures__/command-test-fixtures'
import { pushBranchWithGit } from './push-branch'

describe('pushBranchWithGit', () => {
  it('pushes the branch and sets the upstream', async () => {
    const runCommand = fakeCommands([{ stdout: '', stderr: '', exitCode: 0 }])

    await pushBranchWithGit({ runCommand })({
      worktreePath: '/worktree',
      branch: 'issue-455-add-it',
    })

    expect(runCommand.requests[0]?.arguments).toStrictEqual([
      'push',
      '--set-upstream',
      'origin',
      'issue-455-add-it',
    ])
  })

  it('fails when the remote refuses the push', async () => {
    const runCommand = fakeCommands([{ stdout: '', stderr: 'permission denied', exitCode: 128 }])

    await expect(
      pushBranchWithGit({ runCommand })({ worktreePath: '/worktree', branch: 'issue-455-add-it' }),
    ).rejects.toThrow('permission denied')
  })
})
