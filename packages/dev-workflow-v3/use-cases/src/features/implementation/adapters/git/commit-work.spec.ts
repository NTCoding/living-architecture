import { describe, expect, it } from 'vitest'
import { fakeCommands } from '../../../../infra/external-clients/process/__fixtures__/command-test-fixtures'
import { commitWorkWithGit } from './commit-work'

describe('commitWorkWithGit', () => {
  it('stages everything, commits and returns the new sha', async () => {
    const runCommand = fakeCommands([
      { stdout: '', stderr: '', exitCode: 0 },
      { stdout: '', stderr: '', exitCode: 0 },
      { stdout: '4d83240f6\n', stderr: '', exitCode: 0 },
    ])

    const commit = await commitWorkWithGit({ runCommand })({
      worktreePath: '/worktree',
      message: 'feat: add it',
    })

    expect(commit).toStrictEqual({ sha: '4d83240f6' })
    expect(runCommand.requests[1]?.arguments).toStrictEqual(['commit', '--message', 'feat: add it'])
  })

  it('fails when the commit is refused', async () => {
    const runCommand = fakeCommands([
      { stdout: '', stderr: '', exitCode: 0 },
      { stdout: '', stderr: 'nothing to commit', exitCode: 1 },
    ])

    await expect(
      commitWorkWithGit({ runCommand })({ worktreePath: '/worktree', message: 'feat: add it' }),
    ).rejects.toThrow('nothing to commit')
  })
})
