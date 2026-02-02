import {
  describe, it, expect 
} from 'vitest'
import {
  sanitizeBranchNameForPath, buildReflectionFilePath 
} from './reflection-path'

describe('sanitizeBranchNameForPath', () => {
  it('preserves alphanumeric characters, hyphens, and underscores', () => {
    expect(sanitizeBranchNameForPath('issue-249_fix')).toBe('issue-249_fix')
  })

  it('replaces slashes with underscores', () => {
    expect(sanitizeBranchNameForPath('feature/add-auth')).toBe('feature_add-auth')
  })

  it('replaces dots and spaces with underscores', () => {
    expect(sanitizeBranchNameForPath('v2.0 release')).toBe('v2_0_release')
  })

  it('handles empty string', () => {
    expect(sanitizeBranchNameForPath('')).toBe('')
  })
})

describe('buildReflectionFilePath', () => {
  it('builds path with date and sanitized branch name', () => {
    const result = buildReflectionFilePath('issue-249', '2025-01-15')

    expect(result).toBe(
      'docs/continuous-improvement/post-merge-reflections/2025-01-15-issue-249.md',
    )
  })

  it('sanitizes branch name with special characters', () => {
    const result = buildReflectionFilePath('feature/my.branch', '2025-06-01')

    expect(result).toBe(
      'docs/continuous-improvement/post-merge-reflections/2025-06-01-feature_my_branch.md',
    )
  })
})
