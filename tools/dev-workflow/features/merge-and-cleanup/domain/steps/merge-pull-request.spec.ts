import {
  describe, it, expect 
} from 'vitest'
import { createMergePullRequestStep } from './merge-pull-request'
import { WorktreeError } from '../worktree-operations'
import { buildContext } from './merge-cleanup-context-fixture'

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

  it('passes PR number 0 correctly', async () => {
    const mergedPRs: number[] = []
    const step = createMergePullRequestStep({
      mergePR: async (prNumber) => {
        mergedPRs.push(prNumber)
      },
    })

    await step.execute(buildContext({ prNumber: 0 }))

    expect(mergedPRs).toStrictEqual([0])
  })

  it('passes large PR number correctly', async () => {
    const mergedPRs: number[] = []
    const step = createMergePullRequestStep({
      mergePR: async (prNumber) => {
        mergedPRs.push(prNumber)
      },
    })

    await step.execute(buildContext({ prNumber: 99999 }))

    expect(mergedPRs).toStrictEqual([99999])
  })
})
