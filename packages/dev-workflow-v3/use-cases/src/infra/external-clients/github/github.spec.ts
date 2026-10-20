import { describe, expect, it } from 'vitest'
import { ghOutput, toGithubCommand } from './github'

describe('toGithubCommand', () => {
  it('runs gh in the working directory', () => {
    expect(
      toGithubCommand({ workingDirectory: '/worktree', arguments: ['pr', 'view'] }),
    ).toStrictEqual({ command: 'gh', arguments: ['pr', 'view'], workingDirectory: '/worktree' })
  })
})

describe('ghOutput', () => {
  it('returns the output of a gh command', async () => {
    const output = await ghOutput(
      () => Promise.resolve({ stdout: '{"number":549}', stderr: '', exitCode: 0 }),
      { workingDirectory: '/worktree', arguments: ['pr', 'view'] },
    )

    expect(output).toBe('{"number":549}')
  })

  it('throws when gh fails', async () => {
    await expect(
      ghOutput(() => Promise.resolve({ stdout: '', stderr: 'not logged in', exitCode: 4 }), {
        workingDirectory: '/worktree',
        arguments: ['pr', 'view'],
      }),
    ).rejects.toThrow('exited with 4: not logged in')
  })
})
