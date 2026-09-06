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
import { readGitRepositoryStatus } from './git-client'

describe('readGitRepositoryStatus', () => {
  it('reads repository status using the remote default branch', () => {
    const executeGit = vi.fn((_binary: string, args: readonly string[]) => {
      const command = args.join(' ')
      const outputs: Record<string, string> = {
        'symbolic-ref refs/remotes/origin/HEAD --short': 'origin/trunk',
        'rev-parse --verify origin/trunk^{commit}': 'default123',
        'rev-parse --abbrev-ref HEAD': 'feature/example',
        'status --porcelain': '',
        'rev-parse HEAD': 'abc123',
        'diff --name-only origin/trunk...HEAD': 'src/a.ts\n\nsrc/b.ts',
        'rev-list origin/trunk..HEAD': 'abc123',
      }
      const output = outputs[command]
      if (output === undefined) throw new UnexpectedGitCommandError(command)
      return output
    })

    expect(readGitRepositoryStatus('custom-git', executeGit)).toStrictEqual({
      changedFilesVsDefault: ['src/a.ts', 'src/b.ts'],
      currentBranch: 'feature/example',
      defaultBranch: 'trunk',
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

  it('reports default branch discovery failure instead of assuming local main', () => {
    const executeGit = vi.fn((_binary: string, args: readonly string[]) => {
      const command = args.join(' ')
      if (command.startsWith('symbolic-ref')) throw new MissingRemoteHeadError()
      throw new UnexpectedGitCommandError(command)
    })

    expect(() => readGitRepositoryStatus('git', executeGit)).toThrow(MissingRemoteHeadError)
  })

  it('reports an unresolved remote default reference before reading status', () => {
    const executeGit = vi.fn((_binary: string, args: readonly string[]) => {
      const command = args.join(' ')
      if (command === 'symbolic-ref refs/remotes/origin/HEAD --short') return 'origin/main'
      if (command === 'rev-parse --verify origin/main^{commit}') {
        throw new MissingRemoteHeadError()
      }
      throw new UnexpectedGitCommandError(command)
    })

    expect(() => readGitRepositoryStatus('git', executeGit)).toThrow(MissingRemoteHeadError)
  })
})

it('rejects an unexpected remote default reference instead of inventing a target branch', () => {
  const executeGit = vi.fn().mockReturnValueOnce('other/trunk').mockReturnValueOnce('default123')
  expect(() => readGitRepositoryStatus('git', executeGit)).toThrow('Invalid')
  expect(executeGit).toHaveBeenCalledTimes(2)
})
