import { describe, expect, it } from 'vitest'
import { WorktreeReference } from './worktree-reference'

describe('WorktreeReference', () => {
  it('keeps the worktree path and branch', () => {
    const worktree = WorktreeReference.from({
      path: '.paseo/worktrees/issue-455',
      branch: 'feature/issue-455-review-cycle',
    })

    expect(worktree.path()).toBe('.paseo/worktrees/issue-455')
    expect(worktree.branch()).toBe('feature/issue-455-review-cycle')
  })

  it('rejects an empty path', () => {
    expect(() => WorktreeReference.from({ path: ' ', branch: 'main' })).toThrow(
      'String must contain at least 1 character(s)',
    )
  })

  it('rejects a branch name with whitespace', () => {
    expect(() => WorktreeReference.from({ path: 'worktree', branch: 'feature issue 455' })).toThrow(
      'A branch name cannot contain whitespace.',
    )
  })
})
