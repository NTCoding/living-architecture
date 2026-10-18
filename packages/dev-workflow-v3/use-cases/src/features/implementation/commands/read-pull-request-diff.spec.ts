import { describe, expect, it } from 'vitest'
import { ReadPullRequestDiff } from './read-pull-request-diff'
import { pullRequest } from './__fixtures__/command-test-fixtures'

describe('ReadPullRequestDiff', () => {
  it('reads the diff of the pull request', async () => {
    const numbers: number[] = []
    const command = new ReadPullRequestDiff(async (request) => {
      numbers.push(request.pullRequestNumber)
      return { diff: 'diff --git a/x b/x' }
    })

    const result = await command.execute(pullRequest)

    expect(result.diff).toBe('diff --git a/x b/x')
    expect(numbers).toStrictEqual([549])
  })
})
