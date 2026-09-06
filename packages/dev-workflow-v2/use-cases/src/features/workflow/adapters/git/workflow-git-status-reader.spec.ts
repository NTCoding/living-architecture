import { expect, it } from 'vitest'
import { createWorkflowGitStatusReader } from './workflow-git-status-reader'

it('translates Git repository status into workflow status', () => {
  const readStatus = createWorkflowGitStatusReader(() => ({
    changedFilesVsDefault: ['src/example.ts'],
    currentBranch: 'feature/example',
    hasCommitsVsDefault: true,
    defaultBranch: 'main',
    headCommit: 'abc123',
    workingTreeClean: false,
  }))

  expect(readStatus()).toStrictEqual({
    changedFilesVsDefault: ['src/example.ts'],
    currentBranch: 'feature/example',
    hasCommitsVsDefault: true,
    defaultBranch: 'main',
    headCommit: 'abc123',
    workingTreeClean: false,
  })
})
