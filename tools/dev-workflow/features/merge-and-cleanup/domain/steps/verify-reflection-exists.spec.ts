import {
  describe, it, expect 
} from 'vitest'
import { createVerifyReflectionExistsStep } from './verify-reflection-exists'
import type { MergeCleanupContext } from '../merge-cleanup-context'

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

describe('verify-reflection-exists', () => {
  it('succeeds when reflection file exists', async () => {
    const step = createVerifyReflectionExistsStep({ fileExists: async () => true })

    const result = await step.execute(buildContext())

    expect(result.type).toBe('success')
  })

  it('fails when reflection file does not exist', async () => {
    const step = createVerifyReflectionExistsStep({ fileExists: async () => false })

    const result = await step.execute(buildContext())

    expect(result.type).toBe('failure')
    expect(result.type === 'failure' && result.details).toStrictEqual({
      nextAction: 'run_reflection',
      nextInstructions: expect.stringContaining('/pre-merge-reflection'),
    })
  })

  it('includes the reflection file path in failure message', async () => {
    const step = createVerifyReflectionExistsStep({ fileExists: async () => false })

    const result = await step.execute(
      buildContext({ reflectionFilePath: 'reviews/custom/post-merge-reflection.md' }),
    )

    expect(result.type === 'failure' && result.details).toStrictEqual({
      nextAction: 'run_reflection',
      nextInstructions: expect.stringContaining('reviews/custom/post-merge-reflection.md'),
    })
  })
})
