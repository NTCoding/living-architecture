import { describe, expect, it } from 'vitest'
import { fakeCommands } from '../../../../infra/external-clients/process/__fixtures__/command-test-fixtures'
import { runProjectChecksWithCommands } from './run-project-checks'

describe('runProjectChecksWithCommands', () => {
  it('reports both checks as passed when the commands succeed', async () => {
    const runCommand = fakeCommands([
      { stdout: '', stderr: '', exitCode: 0 },
      { stdout: '', stderr: '', exitCode: 0 },
    ])

    const result = await runProjectChecksWithCommands({ runCommand })({ worktreePath: '/worktree' })

    expect(result.checks).toStrictEqual([
      { name: 'affected lint, typecheck and test', passed: true },
      { name: 'role check', passed: true },
    ])
    expect(runCommand.requests[0]?.arguments).toStrictEqual([
      'nx',
      'affected',
      '-t',
      'lint',
      'typecheck',
      'test',
    ])
  })

  it('reports the check that failed', async () => {
    const runCommand = fakeCommands([
      { stdout: '', stderr: 'unused dependency', exitCode: 1 },
      { stdout: '', stderr: '', exitCode: 0 },
    ])

    const result = await runProjectChecksWithCommands({ runCommand })({ worktreePath: '/worktree' })

    expect(result.checks).toStrictEqual([
      { name: 'affected lint, typecheck and test', passed: false },
      { name: 'role check', passed: true },
    ])
  })
})
