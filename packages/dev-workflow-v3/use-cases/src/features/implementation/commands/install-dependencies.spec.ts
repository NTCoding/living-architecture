import { describe, expect, it } from 'vitest'
import { InstallDependencies } from './install-dependencies'
import { StubFailure, worktree } from './__fixtures__/command-test-fixtures'

describe('InstallDependencies', () => {
  it('installs in the worktree', async () => {
    const installed: string[] = []
    const command = new InstallDependencies(async (request) => {
      installed.push(request.worktreePath)
    })

    const result = await command.execute(worktree)

    expect(result.worktreePath).toBe(worktree.worktreePath)
    expect(installed).toStrictEqual([worktree.worktreePath])
  })

  it('fails when the install fails', async () => {
    const command = new InstallDependencies(async () => {
      throw new StubFailure('lockfile mismatch')
    })

    await expect(command.execute(worktree)).rejects.toThrow('lockfile mismatch')
  })
})
