import { describe, expect, it } from 'vitest'
import { gitOutput, toGitCommand } from './git'

describe('toGitCommand', () => {
  it('runs git in the worktree', () => {
    expect(
      toGitCommand({ worktreePath: '/worktree', arguments: ['rev-parse', 'HEAD'] }),
    ).toStrictEqual({
      command: 'git',
      arguments: ['rev-parse', 'HEAD'],
      workingDirectory: '/worktree',
    })
  })
})

describe('gitOutput', () => {
  it('returns the output of a git command', async () => {
    const output = await gitOutput(
      (request) =>
        Promise.resolve({ stdout: `ran ${request.arguments.join(' ')}`, stderr: '', exitCode: 0 }),
      { worktreePath: '/worktree', arguments: ['status'] },
    )

    expect(output).toBe('ran status')
  })

  it('throws when git fails', async () => {
    await expect(
      gitOutput(() => Promise.resolve({ stdout: '', stderr: 'no such branch', exitCode: 1 }), {
        worktreePath: '/worktree',
        arguments: ['rev-parse', 'missing'],
      }),
    ).rejects.toThrow('The command git rev-parse missing exited with 1: no such branch')
  })
})
