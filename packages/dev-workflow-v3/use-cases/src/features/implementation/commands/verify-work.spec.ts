import { describe, expect, it } from 'vitest'
import { VerifyWork } from './verify-work'
import { worktree } from './__fixtures__/command-test-fixtures'

describe('VerifyWork', () => {
  it('reports a green verification when every check passed', async () => {
    const command = new VerifyWork(async () => ({
      checks: [{ name: 'lint', passed: true }],
    }))

    const result = await command.execute(worktree)

    expect(result.green).toBe(true)
    expect(result.checks).toStrictEqual([{ name: 'lint', passed: true }])
  })

  it('names the check that failed', async () => {
    const command = new VerifyWork(async () => ({
      checks: [
        { name: 'lint', passed: true },
        { name: 'test', passed: false },
      ],
    }))

    const result = await command.execute(worktree)

    expect(result.green).toBe(false)
    expect(result.checks.filter((check) => !check.passed).map((check) => check.name)).toStrictEqual(
      ['test'],
    )
  })
})
