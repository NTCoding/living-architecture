import { describe, expect, it } from 'vitest'
import { CommandFailed, requireSuccess, type CommandRequest } from './run-command'

const request: CommandRequest = {
  command: 'git',
  arguments: ['status'],
  workingDirectory: '/worktree',
}

describe('requireSuccess', () => {
  it('returns the output of a command that succeeded', () => {
    expect(requireSuccess({ stdout: 'clean', stderr: '', exitCode: 0 }, request)).toBe('clean')
  })

  it('fails with the command, the exit code and the error output', () => {
    expect(() =>
      requireSuccess({ stdout: '', stderr: 'no such branch', exitCode: 1 }, request),
    ).toThrow(CommandFailed)
    expect(() =>
      requireSuccess({ stdout: '', stderr: 'no such branch', exitCode: 1 }, request),
    ).toThrow('The command git status exited with 1: no such branch')
  })
})
