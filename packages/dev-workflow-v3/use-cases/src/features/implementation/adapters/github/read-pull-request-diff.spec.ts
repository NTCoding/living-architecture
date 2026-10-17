import { describe, expect, it } from 'vitest'
import { fakeCommands } from '../../../../infra/external-clients/process/__fixtures__/command-test-fixtures'
import { readPullRequestDiffWithGithub } from './read-pull-request-diff'

describe('readPullRequestDiffWithGithub', () => {
  it('reads the diff through gh', async () => {
    const runCommand = fakeCommands([{ stdout: 'diff --git a/x b/x\n', stderr: '', exitCode: 0 }])

    const result = await readPullRequestDiffWithGithub({
      runCommand,
      workingDirectory: '/repo',
    })({ pullRequestNumber: 549 })

    expect(result.diff).toBe('diff --git a/x b/x\n')
    expect(runCommand.requests[0]?.arguments).toStrictEqual(['pr', 'diff', '549'])
  })
})
