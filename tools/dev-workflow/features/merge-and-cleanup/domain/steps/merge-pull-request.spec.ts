import {
  describe, it, expect 
} from 'vitest'
import { createMergePullRequestStep } from './merge-pull-request'
import type { MergeCleanupContext } from '../merge-cleanup-context'
import { WorktreeError } from '../worktree-operations'

function buildContext(overrides: Partial<MergeCleanupContext> = {}): MergeCleanupContext {
  return {
    branch: 'issue-249',
    reflectionFilePath:
      'docs/continuous-improvement/post-merge-reflections/2025-01-15-issue-249.md',
    prNumber: 250,
    worktreePath: '/home/user/worktree',
    mainRepoPath: '/home/user/main',
    ...overrides,
  }
}

describe('merge-pull-request', () => {
  it('succeeds when PR merges successfully', async () => {
    const step = createMergePullRequestStep({ mergePR: () => Promise.resolve() })

    const result = await step.execute(buildContext())

    expect(result.type).toBe('success')
  })

  it('passes PR number to merge function', async () => {
    const mergedPRs: number[] = []

    const step = createMergePullRequestStep({
      mergePR: async (prNumber) => {
        mergedPRs.push(prNumber)
      },
    })

    await step.execute(buildContext({ prNumber: 123 }))

    expect(mergedPRs).toStrictEqual([123])
  })

  it('fails when merge throws an error', async () => {
    const step = createMergePullRequestStep({mergePR: () => Promise.reject(new WorktreeError('PR is not mergeable')),})

    const result = await step.execute(buildContext())

    expect(result.type).toBe('failure')
    expect(result.type === 'failure' && result.details).toStrictEqual({
      nextAction: 'fix_merge',
      nextInstructions: expect.stringContaining('PR is not mergeable'),
    })
  })

  it('handles non-Error thrown values', async () => {
    const step = createMergePullRequestStep({ mergePR: () => Promise.reject('string error') })

    const result = await step.execute(buildContext())

    expect(result.type).toBe('failure')
    expect(result.type === 'failure' && result.details).toStrictEqual({
      nextAction: 'fix_merge',
      nextInstructions: expect.stringContaining('string error'),
    })
  })

  it('includes PR number in failure message', async () => {
    const step = createMergePullRequestStep({mergePR: () => Promise.reject(new WorktreeError('blocked')),})

    const result = await step.execute(buildContext({ prNumber: 99 }))

    expect(result.type === 'failure' && result.details).toStrictEqual({
      nextAction: 'fix_merge',
      nextInstructions: expect.stringContaining('PR #99'),
    })
  })
})
