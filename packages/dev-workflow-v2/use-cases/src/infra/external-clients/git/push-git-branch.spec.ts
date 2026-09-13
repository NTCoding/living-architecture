import { expect, it, vi } from 'vitest'
import { pushGitBranch } from './push-git-branch'

const { execFileSync } = vi.hoisted(() => ({
  execFileSync: vi.fn(() => ''),
}))

vi.mock('node:child_process', () => ({ execFileSync }))

it('pushes the branch to origin with upstream tracking', () => {
  const executeGit = vi.fn(() => '')
  pushGitBranch('issue-42', 'git', executeGit)
  expect(executeGit).toHaveBeenCalledWith('git', ['push', '-u', 'origin', 'issue-42'])
})

it('delegates to the default git executor when none is provided', () => {
  pushGitBranch('issue-42')
  expect(execFileSync).toHaveBeenCalledWith('git', ['push', '-u', 'origin', 'issue-42'], {
    encoding: 'utf-8',
  })
})
