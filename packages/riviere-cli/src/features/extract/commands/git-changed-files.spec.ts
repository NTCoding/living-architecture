import {
  describe, it, expect 
} from 'vitest'
import { join } from 'node:path'
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

function createMockExecutor(responses: Record<string, string>): GitExecutor {
  return (_binary, args) => {
    const key = args.join(' ')
    const response = responses[key]
    if (response === undefined) {
      throw new GitProcessError(`Command failed: git ${key}`, `fatal: unknown command or path`)
    }
    return response
  }
}

function attachedHeadResponses(
  base: string,
  overrides: Record<string, string> = {},
): Record<string, string> {
  return {
    'rev-parse --git-dir': '.git',
    'symbolic-ref HEAD': 'refs/heads/feature',
    [`diff --name-only ${base}...HEAD`]: '',
    [`diff --name-only --cached ${base}`]: '',
    'ls-files --others --exclude-standard': '',
    ...overrides,
  }
}

const WORK_DIR = '/fake/project'

describe('detectChangedTypeScriptFiles', () => {
  describe('not a git repository', () => {
    it('throws GitError with NOT_A_REPOSITORY code', () => {
      const executor: GitExecutor = () => {
        throw new GitProcessError('git failed', 'fatal: not a git repository')
      }

      expect(() => detectChangedTypeScriptFiles(WORK_DIR, {}, executor)).toThrow(GitError)
    })

    it('throws NOT_A_REPOSITORY when executor stderr contains not a git repository', () => {
      const executor: GitExecutor = () => {
        throw new GitProcessError('git failed', 'fatal: not a git repository')
      }

      expect(() => detectChangedTypeScriptFiles(WORK_DIR, {}, executor)).toThrow(
        expect.objectContaining({ gitErrorCode: 'NOT_A_REPOSITORY' }),
      )
    })

    it('throws GIT_NOT_FOUND when executor throws ENOENT', () => {
      const executor: GitExecutor = () => {
        const error = new GitProcessError('spawn git ENOENT')
        Object.assign(error, { code: 'ENOENT' })
        throw error
      }

      expect(() => detectChangedTypeScriptFiles(WORK_DIR, {}, executor)).toThrow(
        expect.objectContaining({ gitErrorCode: 'GIT_NOT_FOUND' }),
      )
    })

    it('rethrows non-git errors from executor', () => {
      const executor = createMockExecutor({
        ...attachedHeadResponses('main'),
        'ls-files --others --exclude-standard': '',
      })
      const throwingExecutor: GitExecutor = (binary, args, cwd) => {
        const key = args.join(' ')
        if (key === 'ls-files --others --exclude-standard') {
          throw new UnexpectedError('unexpected failure')
        }
        return executor(binary, args, cwd)
      }

      expect(() =>
        detectChangedTypeScriptFiles(WORK_DIR, { base: 'main' }, throwingExecutor),
      ).toThrow('unexpected failure')
    })

    it('rethrows error with undefined stderr property', () => {
      const executor: GitExecutor = () => {
        const error = new GitProcessError('git failed')
        Object.defineProperty(error, 'stderr', { value: undefined })
        throw error
      }

      expect(() => detectChangedTypeScriptFiles(WORK_DIR, {}, executor)).toThrow('git failed')
    })
  })

  describe('changed TypeScript files on a branch', () => {
    it('returns .ts files changed vs base branch', () => {
      const executor = createMockExecutor(
        attachedHeadResponses('main', { 'diff --name-only main...HEAD': 'new-file.ts' }),
      )

      const result = detectChangedTypeScriptFiles(WORK_DIR, { base: 'main' }, executor)

      expect(result.files).toStrictEqual([join(WORK_DIR, 'new-file.ts')])
      expect(result.warnings).toStrictEqual([])
    })

    it('returns .tsx files changed vs base branch', () => {
      const executor = createMockExecutor(
        attachedHeadResponses('main', { 'diff --name-only main...HEAD': 'component.tsx' }),
      )

      const result = detectChangedTypeScriptFiles(WORK_DIR, { base: 'main' }, executor)

      expect(result.files).toStrictEqual([join(WORK_DIR, 'component.tsx')])
    })

    it('excludes non-TypeScript files', () => {
      const diffOverride = { 'diff --name-only main...HEAD': 'readme.md\nstyle.css\nadded.ts' }
      const executor = createMockExecutor(attachedHeadResponses('main', diffOverride))

      const result = detectChangedTypeScriptFiles(WORK_DIR, { base: 'main' }, executor)

      expect(result.files).toStrictEqual([join(WORK_DIR, 'added.ts')])
    })

    it('returns empty array when no TypeScript files changed', () => {
      const diffOverride = { 'diff --name-only main...HEAD': 'readme.md' }
      const executor = createMockExecutor(attachedHeadResponses('main', diffOverride))

      const result = detectChangedTypeScriptFiles(WORK_DIR, { base: 'main' }, executor)

      expect(result.files).toStrictEqual([])
      expect(result.warnings).toStrictEqual([])
    })

    it('returns empty when branch has no changes vs base', () => {
      const executor = createMockExecutor(attachedHeadResponses('main'))

      const result = detectChangedTypeScriptFiles(WORK_DIR, { base: 'main' }, executor)

      expect(result.files).toStrictEqual([])
    })
  })

  describe('base branch detection', () => {
    it('uses provided base option over default', () => {
      const executor = createMockExecutor(
        attachedHeadResponses('develop', { 'diff --name-only develop...HEAD': 'file.ts' }),
      )

      const result = detectChangedTypeScriptFiles(WORK_DIR, { base: 'develop' }, executor)

      expect(result.files).toStrictEqual([join(WORK_DIR, 'file.ts')])
    })

    it('falls back to main when no base provided and no origin/HEAD', () => {
      const executor: GitExecutor = (_binary, args) => {
        const key = args.join(' ')
        if (key === 'rev-parse --git-dir') return '.git'
        if (key === 'symbolic-ref HEAD') return 'refs/heads/feature'
        if (key === 'symbolic-ref refs/remotes/origin/HEAD') {
          throw new GitProcessError('not found', 'fatal: ref not found')
        }
        if (key === 'diff --name-only main...HEAD') return 'file.ts'
        if (key === 'diff --name-only --cached main') return ''
        if (key === 'ls-files --others --exclude-standard') return ''
        throw new GitProcessError(`Unexpected: git ${key}`)
      }

      const result = detectChangedTypeScriptFiles(WORK_DIR, {}, executor)

      expect(result.files).toStrictEqual([join(WORK_DIR, 'file.ts')])
    })

    it('throws GitError when base branch does not exist', () => {
      const executor: GitExecutor = (_binary, args) => {
        const key = args.join(' ')
        if (key === 'rev-parse --git-dir') return '.git'
        if (key === 'symbolic-ref HEAD') return 'refs/heads/feature'
        throw new UnexpectedError('unknown revision nonexistent')
      }

      expect(() =>
        detectChangedTypeScriptFiles(WORK_DIR, { base: 'nonexistent' }, executor),
      ).toThrow(GitError)
    })
  })

  describe('detached HEAD', () => {
    it('uses HEAD~1 as base when HEAD is detached', () => {
      const executor: GitExecutor = (_binary, args) => {
        const key = args.join(' ')
        if (key === 'rev-parse --git-dir') return '.git'
        if (key === 'symbolic-ref HEAD') {
          throw new GitProcessError('not on a branch', 'fatal: ref HEAD is not a symbolic ref')
        }
        if (key === 'diff --name-only HEAD~1...HEAD') return 'second.ts'
        if (key === 'diff --name-only --cached HEAD~1') return ''
        if (key === 'ls-files --others --exclude-standard') return ''
        throw new GitProcessError(`Unexpected: git ${key}`)
      }

      const result = detectChangedTypeScriptFiles(WORK_DIR, {}, executor)

      expect(result.files).toStrictEqual([join(WORK_DIR, 'second.ts')])
    })
  })

  describe('uncommitted changes', () => {
    it('includes staged TypeScript files', () => {
      const executor = createMockExecutor(
        attachedHeadResponses('main', { 'diff --name-only --cached main': 'staged.ts' }),
      )

      const result = detectChangedTypeScriptFiles(WORK_DIR, { base: 'main' }, executor)

      expect(result.files).toContain(join(WORK_DIR, 'staged.ts'))
    })

    it('warns about untracked TypeScript files', () => {
      const overrides = {
        'diff --name-only main...HEAD': 'committed.ts',
        'ls-files --others --exclude-standard': 'untracked.ts',
      }
      const executor = createMockExecutor(attachedHeadResponses('main', overrides))

      const result = detectChangedTypeScriptFiles(WORK_DIR, { base: 'main' }, executor)

      expect(result.warnings.length).toBeGreaterThan(0)
      expect(result.warnings[0]).toContain('untracked')
    })
  })

  describe('files in subdirectories', () => {
    it('returns full paths for files in nested directories', () => {
      const diffOverride = { 'diff --name-only main...HEAD': 'src/domain/order.ts' }
      const executor = createMockExecutor(attachedHeadResponses('main', diffOverride))

      const result = detectChangedTypeScriptFiles(WORK_DIR, { base: 'main' }, executor)

      expect(result.files).toStrictEqual([join(WORK_DIR, 'src', 'domain', 'order.ts')])
    })
  })

  describe('error handling with injected executor', () => {
    it('rethrows GitError from getCommittedChangedFiles', () => {
      const executor: GitExecutor = (_binary, args) => {
        const key = args.join(' ')
        if (key === 'rev-parse --git-dir') return '.git'
        if (key === 'symbolic-ref HEAD') return 'refs/heads/feature'
        throw new GitProcessError('fatal: not a git repository', 'fatal: not a git repository')
      }

      expect(() => detectChangedTypeScriptFiles(WORK_DIR, { base: 'main' }, executor)).toThrow(
        expect.objectContaining({ gitErrorCode: 'NOT_A_REPOSITORY' }),
      )
    })

    it('wraps non-GitError as BASE_BRANCH_NOT_FOUND from getCommittedChangedFiles', () => {
      const executor: GitExecutor = (_binary, args) => {
        const key = args.join(' ')
        if (key === 'rev-parse --git-dir') return '.git'
        if (key === 'symbolic-ref HEAD') return 'refs/heads/feature'
        throw new UnexpectedError('some other git failure')
      }

      expect(() => detectChangedTypeScriptFiles(WORK_DIR, { base: 'main' }, executor)).toThrow(
        expect.objectContaining({ gitErrorCode: 'BASE_BRANCH_NOT_FOUND' }),
      )
    })

    it('handles stderr extraction from non-Error throws', () => {
      const executor: GitExecutor = () => {
        throw 'string error'
      }

      expect(() => detectChangedTypeScriptFiles(WORK_DIR, {}, executor)).toThrow('string error')
    })

    it('returns empty staged files when no staged changes exist', () => {
      const executor = createMockExecutor(
        attachedHeadResponses('main', { 'diff --name-only main...HEAD': 'committed.ts' }),
      )

      const result = detectChangedTypeScriptFiles(WORK_DIR, { base: 'main' }, executor)

      expect(result.files).toStrictEqual([join(WORK_DIR, 'committed.ts')])
    })
  })
})
