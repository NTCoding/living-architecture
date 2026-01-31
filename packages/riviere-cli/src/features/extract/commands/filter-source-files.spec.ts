import {
  describe, it, expect, afterEach 
} from 'vitest'
import { execFileSync } from 'node:child_process'
import {
  realpathSync, mkdtempSync, mkdirSync, writeFileSync, rmSync 
} from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  filterSourceFiles, SourceFilterError 
} from './filter-source-files'

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
  return realpathSync(mkdtempSync(join(tmpdir(), 'filter-source-')))
}

function initRepoWithCommit(cwd: string): void {
  git(cwd, ['init'])
  git(cwd, ['config', 'user.email', 'test@test.com'])
  git(cwd, ['config', 'user.name', 'Test'])
  writeFileSync(join(cwd, 'initial.ts'), 'export const x = 1')
  git(cwd, ['add', '.'])
  git(cwd, ['commit', '-m', 'initial'])
}

describe('filterSourceFiles', () => {
  const tempDirs: string[] = []
  const originalCwd = process.cwd()

  function makeTempDir(): string {
    const dir = createTempDir()
    tempDirs.push(dir)
    return dir
  }

  afterEach(() => {
    process.chdir(originalCwd)
    for (const dir of tempDirs) {
      rmSync(dir, { recursive: true })
    }
    tempDirs.length = 0
  })

  describe('no filtering (default)', () => {
    it('returns all source files when neither --pr nor --files specified', () => {
      const allFiles = ['/src/a.ts', '/src/b.ts']

      const result = filterSourceFiles(allFiles, {})

      expect(result.files).toStrictEqual(allFiles)
    })
  })

  describe('--pr filtering', () => {
    it('returns only files changed on feature branch', () => {
      const dir = makeTempDir()
      initRepoWithCommit(dir)
      git(dir, ['checkout', '-b', 'feature'])
      mkdirSync(join(dir, 'src'))
      writeFileSync(join(dir, 'src', 'changed.ts'), 'export const y = 2')
      git(dir, ['add', '.'])
      git(dir, ['commit', '-m', 'add changed'])
      process.chdir(dir)

      const allFiles = [join(dir, 'initial.ts'), join(dir, 'src', 'changed.ts')]

      const result = filterSourceFiles(allFiles, {
        pr: true,
        base: 'main',
      })

      expect(result.files).toStrictEqual([join(dir, 'src', 'changed.ts')])
    })

    it('emits warnings for unstaged TypeScript files', () => {
      const dir = makeTempDir()
      initRepoWithCommit(dir)
      git(dir, ['checkout', '-b', 'feature'])
      writeFileSync(join(dir, 'committed.ts'), 'export const c = 1')
      git(dir, ['add', '.'])
      git(dir, ['commit', '-m', 'commit'])
      writeFileSync(join(dir, 'unstaged.ts'), 'export const u = 1')
      process.chdir(dir)

      const stderrOutput: string[] = []
      const originalError = console.error
      console.error = (msg: string) => stderrOutput.push(msg)

      filterSourceFiles([join(dir, 'committed.ts')], {
        pr: true,
        base: 'main',
      })

      console.error = originalError
      expect(stderrOutput.some((msg) => msg.includes('unstaged'))).toBe(true)
    })

    it('throws SourceFilterError with GIT_ERROR when not in a git repo', () => {
      const dir = makeTempDir()
      process.chdir(dir)

      expect(() => filterSourceFiles([], { pr: true })).toThrow(SourceFilterError)
    })

    it('includes gitError on SourceFilterError for git failures', () => {
      const dir = makeTempDir()
      process.chdir(dir)

      expect(() => filterSourceFiles([], { pr: true })).toThrow(
        expect.objectContaining({ filterErrorKind: 'GIT_ERROR' }),
      )
    })
  })

  describe('--files filtering', () => {
    it('returns intersection of allSourceFiles and specified files', () => {
      const dir = makeTempDir()
      writeFileSync(join(dir, 'a.ts'), 'export const a = 1')
      writeFileSync(join(dir, 'b.ts'), 'export const b = 1')
      process.chdir(dir)

      const allFiles = [join(dir, 'a.ts'), join(dir, 'b.ts')]
      const result = filterSourceFiles(allFiles, { files: [join(dir, 'a.ts')] })

      expect(result.files).toStrictEqual([join(dir, 'a.ts')])
    })

    it('throws SourceFilterError with FILES_NOT_FOUND for missing files', () => {
      const dir = makeTempDir()
      process.chdir(dir)

      expect(() => filterSourceFiles([], { files: ['nonexistent.ts'] })).toThrow(
        expect.objectContaining({ filterErrorKind: 'FILES_NOT_FOUND' }),
      )
    })
  })
})
