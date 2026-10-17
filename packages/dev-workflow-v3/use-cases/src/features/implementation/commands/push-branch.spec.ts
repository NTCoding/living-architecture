import { describe, expect, it } from 'vitest'
import { PushBranch } from './push-branch'
import { StubFailure, worktree } from './__fixtures__/command-test-fixtures'

describe('PushBranch', () => {
  it('pushes the branch of the worktree', async () => {
    const pushed: string[] = []
    const command = new PushBranch(async (request) => {
      pushed.push(request.branch)
    })

    const result = await command.execute({ worktree })

    expect(result.branch).toBe('issue-455-add-a-review-cycle')
    expect(pushed).toStrictEqual(['issue-455-add-a-review-cycle'])
  })

  it('fails when the push is refused', async () => {
    const command = new PushBranch(async () => {
      throw new StubFailure('the remote refused the push')
    })

    await expect(command.execute({ worktree })).rejects.toThrow('the remote refused the push')
  })
})
