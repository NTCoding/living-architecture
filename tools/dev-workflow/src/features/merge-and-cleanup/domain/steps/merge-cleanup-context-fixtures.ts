import type { MergeCleanupContext } from '../merge-cleanup-context'

export function buildContext(overrides: Partial<MergeCleanupContext> = {}): MergeCleanupContext {
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
