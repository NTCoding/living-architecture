import { expect, it, vi } from 'vitest'
import { pushGitBranch } from './push-git-branch'

it('pushes the branch to origin with upstream tracking', () => {
  const executeGit = vi.fn(() => '')
  pushGitBranch('issue-42', 'git', executeGit)
  expect(executeGit).toHaveBeenCalledWith('git', ['push', '-u', 'origin', 'issue-42'])
})
