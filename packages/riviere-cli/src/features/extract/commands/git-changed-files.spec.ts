import {
  describe, it, expect, afterEach 
} from 'vitest'
import { execFileSync } from 'node:child_process'
import {
  mkdtempSync, mkdirSync, writeFileSync, rmSync 
} from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  detectChangedTypeScriptFiles, GitError 
} from './git-changed-files'
import type { GitExecutor } from './git-changed-files'

class GitProcessError extends Error {
  constructor(
    message: string,
    readonly stderr?: string,
  ) {
    super(message)
    this.name = 'GitProcessError'
    if (stderr !== undefined) {
      Object.defineProperty(this, 'stderr', { value: stderr })
    }
  }
}

class UnexpectedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UnexpectedError'
  }
}

function resolveGitBinary(): string {
  return execFileSync('/usr/bin/which', ['git'], { encoding: 'utf-8' }).trim()
}

const GIT_BINARY = resolveGitBinary()

function git(cwd: string, args: readonly string[]): string {
  return execFileSync(GIT_BINARY, args, {
    cwd,
    encoding: 'utf-8',
  }).trim()
}

function createTempDir(): string {
  return mkdtempSync(join(tmpdir(), 'git-changed-files-'))
}

function initRepoWithCommit(cwd: string): void {
  git(cwd, ['init'])
  git(cwd, ['config', 'user.email', 'test@test.com'])
  git(cwd, ['config', 'user.name', 'Test'])
  writeFileSync(join(cwd, 'initial.ts'), 'export const x = 1')
  git(cwd, ['add', '.'])
  git(cwd, ['commit', '-m', 'initial'])
}

function createExecutorThatThrowsWithStderr(stderr: string): GitExecutor {
  return () => {
    throw new GitProcessError('git failed', stderr)
  }
}

function createExecutorThatThrowsPlainError(): GitExecutor {
  return () => {
    throw new UnexpectedError('unexpected failure')
  }
}

describe('detectChangedTypeScriptFiles', () => {
  const tempDirs: string[] = []

  function makeTempDir(): string {
    const dir = createTempDir()
    tempDirs.push(dir)
    return dir
  }

  afterEach(() => {
    for (const dir of tempDirs) {
      rmSync(dir, { recursive: true })
    }
    tempDirs.length = 0
  })

  describe('not a git repository', () => {
    it('throws GitError with NOT_A_REPOSITORY code', () => {
      const dir = makeTempDir()

      expect(() => detectChangedTypeScriptFiles(dir, {})).toThrow(GitError)
    })

    it('throws NOT_A_REPOSITORY when executor stderr contains not a git repository', () => {
      const dir = makeTempDir()
      initRepoWithCommit(dir)
      const executor = createExecutorThatThrowsWithStderr('fatal: not a git repository')

      expect(() => detectChangedTypeScriptFiles(dir, {}, executor)).toThrow(
        expect.objectContaining({ gitErrorCode: 'NOT_A_REPOSITORY' }),
      )
    })

    it('rethrows non-git errors from executor', () => {
      const dir = makeTempDir()
      initRepoWithCommit(dir)
      const executor = createExecutorThatThrowsPlainError()

      expect(() => detectChangedTypeScriptFiles(dir, {}, executor)).toThrow('unexpected failure')
    })

    it('rethrows error with undefined stderr property', () => {
      const dir = makeTempDir()
      initRepoWithCommit(dir)
      const executor: GitExecutor = () => {
        const error = new GitProcessError('git failed')
        Object.defineProperty(error, 'stderr', { value: undefined })
        throw error
      }

      expect(() => detectChangedTypeScriptFiles(dir, {}, executor)).toThrow('git failed')
    })
  })

  describe('changed TypeScript files on a branch', () => {
    it('returns .ts files changed vs base branch', () => {
      const dir = makeTempDir()
      initRepoWithCommit(dir)
      git(dir, ['checkout', '-b', 'feature'])
      writeFileSync(join(dir, 'new-file.ts'), 'export const y = 2')
      git(dir, ['add', '.'])
      git(dir, ['commit', '-m', 'add new-file'])

      const result = detectChangedTypeScriptFiles(dir, { base: 'main' })

      expect(result.files).toStrictEqual([join(dir, 'new-file.ts')])
      expect(result.warnings).toStrictEqual([])
    })

    it('returns .tsx files changed vs base branch', () => {
      const dir = makeTempDir()
      initRepoWithCommit(dir)
      git(dir, ['checkout', '-b', 'feature'])
      writeFileSync(join(dir, 'component.tsx'), 'export const C = () => null')
      git(dir, ['add', '.'])
      git(dir, ['commit', '-m', 'add component'])

      const result = detectChangedTypeScriptFiles(dir, { base: 'main' })

      expect(result.files).toStrictEqual([join(dir, 'component.tsx')])
    })

    it('excludes non-TypeScript files', () => {
      const dir = makeTempDir()
      initRepoWithCommit(dir)
      git(dir, ['checkout', '-b', 'feature'])
      writeFileSync(join(dir, 'readme.md'), '# Hello')
      writeFileSync(join(dir, 'style.css'), 'body {}')
      writeFileSync(join(dir, 'added.ts'), 'export const z = 3')
      git(dir, ['add', '.'])
      git(dir, ['commit', '-m', 'add files'])

      const result = detectChangedTypeScriptFiles(dir, { base: 'main' })

      expect(result.files).toStrictEqual([join(dir, 'added.ts')])
    })

    it('returns empty array when no TypeScript files changed', () => {
      const dir = makeTempDir()
      initRepoWithCommit(dir)
      git(dir, ['checkout', '-b', 'feature'])
      writeFileSync(join(dir, 'readme.md'), '# Hello')
      git(dir, ['add', '.'])
      git(dir, ['commit', '-m', 'add readme'])

      const result = detectChangedTypeScriptFiles(dir, { base: 'main' })

      expect(result.files).toStrictEqual([])
      expect(result.warnings).toStrictEqual([])
    })

    it('returns empty when branch has no changes vs base', () => {
      const dir = makeTempDir()
      initRepoWithCommit(dir)
      git(dir, ['checkout', '-b', 'feature'])

      const result = detectChangedTypeScriptFiles(dir, { base: 'main' })

      expect(result.files).toStrictEqual([])
    })
  })

  describe('base branch detection', () => {
    it('uses provided base option over default', () => {
      const dir = makeTempDir()
      initRepoWithCommit(dir)
      git(dir, ['checkout', '-b', 'develop'])
      git(dir, ['checkout', '-b', 'feature'])
      writeFileSync(join(dir, 'file.ts'), 'export const a = 1')
      git(dir, ['add', '.'])
      git(dir, ['commit', '-m', 'add file'])

      const result = detectChangedTypeScriptFiles(dir, { base: 'develop' })

      expect(result.files).toStrictEqual([join(dir, 'file.ts')])
    })

    it('falls back to main when no base provided and no origin/HEAD', () => {
      const dir = makeTempDir()
      initRepoWithCommit(dir)
      git(dir, ['checkout', '-b', 'feature'])
      writeFileSync(join(dir, 'file.ts'), 'export const a = 1')
      git(dir, ['add', '.'])
      git(dir, ['commit', '-m', 'add file'])

      const result = detectChangedTypeScriptFiles(dir, {})

      expect(result.files).toStrictEqual([join(dir, 'file.ts')])
    })

    it('throws GitError when base branch does not exist', () => {
      const dir = makeTempDir()
      initRepoWithCommit(dir)
      git(dir, ['checkout', '-b', 'feature'])

      expect(() => detectChangedTypeScriptFiles(dir, { base: 'nonexistent' })).toThrow(GitError)
    })
  })

  describe('detached HEAD', () => {
    it('uses HEAD~1 as base when HEAD is detached', () => {
      const dir = makeTempDir()
      initRepoWithCommit(dir)
      writeFileSync(join(dir, 'second.ts'), 'export const s = 2')
      git(dir, ['add', '.'])
      git(dir, ['commit', '-m', 'second commit'])
      const commitHash = git(dir, ['rev-parse', 'HEAD'])
      git(dir, ['checkout', commitHash])

      const result = detectChangedTypeScriptFiles(dir, {})

      expect(result.files).toStrictEqual([join(dir, 'second.ts')])
    })
  })

  describe('uncommitted changes', () => {
    it('includes staged TypeScript files', () => {
      const dir = makeTempDir()
      initRepoWithCommit(dir)
      git(dir, ['checkout', '-b', 'feature'])
      writeFileSync(join(dir, 'staged.ts'), 'export const s = 1')
      git(dir, ['add', 'staged.ts'])

      const result = detectChangedTypeScriptFiles(dir, { base: 'main' })

      expect(result.files).toContain(join(dir, 'staged.ts'))
    })

    it('warns about unstaged TypeScript files', () => {
      const dir = makeTempDir()
      initRepoWithCommit(dir)
      git(dir, ['checkout', '-b', 'feature'])
      writeFileSync(join(dir, 'committed.ts'), 'export const c = 1')
      git(dir, ['add', '.'])
      git(dir, ['commit', '-m', 'commit'])
      writeFileSync(join(dir, 'unstaged.ts'), 'export const u = 1')

      const result = detectChangedTypeScriptFiles(dir, { base: 'main' })

      expect(result.warnings.length).toBeGreaterThan(0)
      expect(result.warnings[0]).toContain('unstaged')
    })
  })

  describe('files in subdirectories', () => {
    it('returns full paths for files in nested directories', () => {
      const dir = makeTempDir()
      initRepoWithCommit(dir)
      git(dir, ['checkout', '-b', 'feature'])
      mkdirSync(join(dir, 'src', 'domain'), { recursive: true })
      writeFileSync(join(dir, 'src', 'domain', 'order.ts'), 'export class Order {}')
      git(dir, ['add', '.'])
      git(dir, ['commit', '-m', 'add nested file'])

      const result = detectChangedTypeScriptFiles(dir, { base: 'main' })

      expect(result.files).toStrictEqual([join(dir, 'src', 'domain', 'order.ts')])
    })
  })

  describe('error handling with injected executor', () => {
    it('rethrows GitError from getCommittedChangedFiles', () => {
      const dir = makeTempDir()
      initRepoWithCommit(dir)
      git(dir, ['checkout', '-b', 'feature'])

      const callTracker = { count: 0 }
      const executor: GitExecutor = (binary, args, execCwd) => {
        callTracker.count++
        if (callTracker.count <= 2) {
          return execFileSync(binary, args, {
            cwd: execCwd,
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe'],
          }).trim()
        }
        throw new GitProcessError('fatal: not a git repository', 'fatal: not a git repository')
      }

      expect(() => detectChangedTypeScriptFiles(dir, { base: 'main' }, executor)).toThrow(
        expect.objectContaining({ gitErrorCode: 'NOT_A_REPOSITORY' }),
      )
    })

    it('wraps non-GitError as BASE_BRANCH_NOT_FOUND from getCommittedChangedFiles', () => {
      const dir = makeTempDir()
      initRepoWithCommit(dir)
      git(dir, ['checkout', '-b', 'feature'])

      const callTracker = { count: 0 }
      const executor: GitExecutor = (binary, args, execCwd) => {
        callTracker.count++
        if (callTracker.count <= 2) {
          return execFileSync(binary, args, {
            cwd: execCwd,
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe'],
          }).trim()
        }
        throw new UnexpectedError('some other git failure')
      }

      expect(() => detectChangedTypeScriptFiles(dir, { base: 'main' }, executor)).toThrow(
        expect.objectContaining({ gitErrorCode: 'BASE_BRANCH_NOT_FOUND' }),
      )
    })

    it('handles stderr extraction from non-Error throws', () => {
      const dir = makeTempDir()
      initRepoWithCommit(dir)
      const executor: GitExecutor = () => {
        throw 'string error'
      }

      expect(() => detectChangedTypeScriptFiles(dir, {}, executor)).toThrow('string error')
    })

    it('returns empty staged files when no staged changes exist', () => {
      const dir = makeTempDir()
      initRepoWithCommit(dir)
      git(dir, ['checkout', '-b', 'feature'])
      writeFileSync(join(dir, 'committed.ts'), 'export const c = 1')
      git(dir, ['add', '.'])
      git(dir, ['commit', '-m', 'commit'])

      const result = detectChangedTypeScriptFiles(dir, { base: 'main' })

      expect(result.files).toStrictEqual([join(dir, 'committed.ts')])
    })
  })
})
