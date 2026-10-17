import { describe, expect, it } from 'vitest'
import { CommitWork } from './commit-work'
import { worktree } from './__fixtures__/command-test-fixtures'

describe('CommitWork', () => {
  it('commits the worktree and records the commit', async () => {
    const command = new CommitWork(async () => ({ sha: '4d83240f6' }))

    const result = await command.execute({ worktree, message: 'feat: add the review cycle' })

    expect(result.commit.sha()).toBe('4d83240f6')
    expect(result.commit.message()).toBe('feat: add the review cycle')
  })

  it('rejects a commit the port reports without a usable sha', async () => {
    const command = new CommitWork(async () => ({ sha: 'not-a-sha' }))

    await expect(
      command.execute({ worktree, message: 'feat: add the review cycle' }),
    ).rejects.toThrow('A commit sha is 7 to 40 lower case hex characters.')
  })
})
