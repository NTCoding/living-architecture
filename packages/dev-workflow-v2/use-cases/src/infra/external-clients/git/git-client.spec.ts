import { describe, expect, it, vi } from 'vitest'

class UnexpectedGitCommandError extends Error {
  constructor(command: string) {
    super(`Unexpected git command: ${command}`)
    this.name = 'UnexpectedGitCommandError'
  }
}

class MissingRemoteHeadError extends Error {
  constructor() {
    super('missing remote HEAD')
    this.name = 'MissingRemoteHeadError'
  }
}
import { pushGitBranch, readGitRepositoryStatus } from './git-client'

describe('readGitRepositoryStatus', () => {
  it('reads repository status using the remote default branch', () => {
    const executeGit = vi.fn((_binary: string, args: readonly string[]) => {
      const command = args.join(' ')
      const outputs: Record<string, string> = {
        'symbolic-ref refs/remotes/origin/HEAD --short': 'origin/trunk',
        'rev-parse --abbrev-ref HEAD': 'feature/example',
        'status --porcelain': '',
        'rev-parse HEAD': 'abc123',
        'diff --name-only trunk HEAD': 'src/a.ts\n\nsrc/b.ts',
        'rev-list HEAD ^trunk': 'abc123',
      }
      const output = outputs[command]
      if (output === undefined) throw new UnexpectedGitCommandError(command)
      return output
    })

    expect(readGitRepositoryStatus('custom-git', executeGit)).toStrictEqual({
      changedFilesVsDefault: ['src/a.ts', 'src/b.ts'],
      currentBranch: 'feature/example',
      hasCommitsVsDefault: true,
      headCommit: 'abc123',
      workingTreeClean: true,
    })
    expect(executeGit).toHaveBeenCalledWith('custom-git', [
      'symbolic-ref',
      'refs/remotes/origin/HEAD',
      '--short',
    ])
  })

  it('falls back to main and reports a dirty branch with no commits', () => {
    const executeGit = vi.fn((_binary: string, args: readonly string[]) => {
      const command = args.join(' ')
      if (command.startsWith('symbolic-ref')) {
        throw new MissingRemoteHeadError()
      }
      if (command === 'status --porcelain') return ' M src/a.ts'
      if (
        command === 'rev-parse --abbrev-ref HEAD' ||
        command === 'rev-parse HEAD' ||
        command === 'diff --name-only main HEAD' ||
        command === 'rev-list HEAD ^main'
      )
        return ''
      throw new UnexpectedGitCommandError(command)
    })

    expect(readGitRepositoryStatus('git', executeGit)).toMatchObject({
      changedFilesVsDefault: [],
      hasCommitsVsDefault: false,
      workingTreeClean: false,
    })
    expect(executeGit).toHaveBeenCalledWith('git', ['diff', '--name-only', 'main', 'HEAD'])
  })
})

describe('pushGitBranch', () => {
  it('pushes the supplied branch to origin without force flags', () => {
    const executeGit = vi.fn(() => '')

    pushGitBranch('issue-42', 'custom-git', executeGit)

    expect(executeGit).toHaveBeenCalledWith('custom-git', ['push', '-u', 'origin', 'issue-42'])
  })
})
