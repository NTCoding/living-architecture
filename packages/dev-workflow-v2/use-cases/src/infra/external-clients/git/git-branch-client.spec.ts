import { describe, expect, it, vi } from 'vitest'
import {
  createGitBranchClient,
  type GitProcessExecutor,
  type GitProcessResult,
} from './git-branch-client'

function result(stdout: string, exitCode = 0, stderr = ''): GitProcessResult {
  return { exitCode, stderr, stdout }
}

describe('GitBranchClient', () => {
  it('rejects a remote HEAD response which does not identify a branch', () => {
    const executeGit: GitProcessExecutor = vi.fn(
      (_gitBinary: string, _workingDirectory: string, argumentsList: readonly string[]) => {
        if (argumentsList[0] === 'ls-remote') return result('123456\tHEAD')
        return result('', 2, 'unexpected command')
      },
    )
    const git = createGitBranchClient('/repository', executeGit)

    expect(() => git.refreshRemoteDefaultBranch()).toThrowError(
      'Expected origin HEAD to identify one branch. Got: 123456\tHEAD',
    )
  })

  it('reports an unexpected branch lookup failure', () => {
    const executeGit: GitProcessExecutor = vi.fn(() => result('', 2, 'lookup failed'))
    const git = createGitBranchClient('/repository', executeGit)

    expect(() => git.branchExists('issue-42-example')).toThrowError(
      'Git command failed while checking branch issue-42-example. lookup failed',
    )
  })

  it('rejects worktree output which identifies a branch without its path', () => {
    const executeGit: GitProcessExecutor = vi.fn(
      (_gitBinary: string, _workingDirectory: string, argumentsList: readonly string[]) =>
        argumentsList.includes('--show-toplevel')
          ? result('/repository')
          : result('branch refs/heads/issue-42-example'),
    )
    const git = createGitBranchClient('/repository', executeGit)

    expect(() => git.branchCheckout('issue-42-example')).toThrowError(
      'Expected worktree path for branch refs/heads/issue-42-example.',
    )
  })

  it('translates branch tracking modes into Git switch arguments', () => {
    const executeGit: GitProcessExecutor = vi.fn(() => result(''))
    const git = createGitBranchClient('/repository', executeGit)

    git.createBranch('issue-42-one', 'origin/trunk', 'none')
    git.createBranch('issue-42-two', 'origin/trunk', 'inherit')

    expect(vi.mocked(executeGit).mock.calls.map((call) => call[2])).toStrictEqual([
      ['switch', '--no-track', '--create', 'issue-42-one', 'origin/trunk'],
      ['switch', '--create', 'issue-42-two', 'origin/trunk'],
    ])
  })
})
