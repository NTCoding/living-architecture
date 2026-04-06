import {
  describe, it, expect 
} from 'vitest'

import { mergeCleanupContextSchema } from './merge-cleanup-context'

describe('mergeCleanupContextSchema', () => {
  it('parses a valid merge-cleanup context', () => {
    const input = {
      branch: 'issue-42',
      reflectionFilePath: 'docs/reflections/issue-42-2025-01-01.md',
      prNumber: 42,
      worktreePath: '/home/user/worktrees/issue-42',
      mainRepoPath: '/repo',
    }

    const result = mergeCleanupContextSchema.parse(input)

    expect(result.branch).toBe('issue-42')
    expect(result.prNumber).toBe(42)
  })

  it('rejects missing required fields', () => {
    expect(() => mergeCleanupContextSchema.parse({ branch: 'main' })).toThrow('invalid_type')
  })
})
