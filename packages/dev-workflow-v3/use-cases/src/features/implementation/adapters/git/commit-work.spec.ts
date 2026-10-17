import { describe, expect, it } from 'vitest'
import { fakeCommands } from '../../../../infra/external-clients/process/__fixtures__/command-test-fixtures'
import { commitWorkWithGit } from './commit-work'

describe('commitWorkWithGit', () => {
  it('stages everything, commits and returns the new sha', async () => {
    const runCommand = fakeCommands([
      { stdout: ' M scripts/hello-world.ts\n', stderr: '', exitCode: 0 },
      { stdout: '', stderr: '', exitCode: 0 },
      { stdout: '', stderr: '', exitCode: 0 },
      { stdout: '4d83240f6\n', stderr: '', exitCode: 0 },
    ])

    const commit = await commitWorkWithGit({ runCommand })({
      worktreePath: '/worktree',
      message: 'feat: add it',
    })

    expect(commit).toStrictEqual({ sha: '4d83240f6' })
    expect(runCommand.requests[2]?.arguments).toStrictEqual(['commit', '--message', 'feat: add it'])
  })

  it('returns the commit already there when the worktree is clean', async () => {
    const runCommand = fakeCommands([
      { stdout: '', stderr: '', exitCode: 0 },
      { stdout: 'e541fdda0\n', stderr: '', exitCode: 0 },
    ])

    const commit = await commitWorkWithGit({ runCommand })({
      worktreePath: '/worktree',
      message: 'feat: add it',
    })

    expect(commit).toStrictEqual({ sha: 'e541fdda0' })
    expect(runCommand.requests).toHaveLength(2)
  })

  it('fails when the commit is refused', async () => {
    const runCommand = fakeCommands([
      { stdout: ' M scripts/hello-world.ts\n', stderr: '', exitCode: 0 },
      { stdout: '', stderr: '', exitCode: 0 },
      { stdout: '', stderr: 'author identity unknown', exitCode: 128 },
    ])

    await expect(
      commitWorkWithGit({ runCommand })({ worktreePath: '/worktree', message: 'feat: add it' }),
    ).rejects.toThrow('The commit was refused: author identity unknown')
  })
})
