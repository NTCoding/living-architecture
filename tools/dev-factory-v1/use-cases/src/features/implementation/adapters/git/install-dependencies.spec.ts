import { describe, expect, it } from 'vitest'
import { fakeCommands } from '../../../../infra/external-clients/process/__fixtures__/command-test-fixtures'
import { installDependenciesWithPnpm } from './install-dependencies'

describe('installDependenciesWithPnpm', () => {
  it('installs from the lockfile in the worktree', async () => {
    const runCommand = fakeCommands([{ stdout: '', stderr: '', exitCode: 0 }])

    await installDependenciesWithPnpm({ runCommand })({ worktreePath: '/worktree' })

    expect(runCommand.requests[0]?.arguments).toStrictEqual(['install', '--frozen-lockfile'])
    expect(runCommand.requests[0]?.workingDirectory).toBe('/worktree')
  })

  it('fails when the install fails', async () => {
    const runCommand = fakeCommands([{ stdout: '', stderr: 'lockfile mismatch', exitCode: 1 }])

    await expect(
      installDependenciesWithPnpm({ runCommand })({ worktreePath: '/worktree' }),
    ).rejects.toThrow('lockfile mismatch')
  })
})
