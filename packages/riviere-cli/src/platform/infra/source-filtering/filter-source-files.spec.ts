import {
  describe, it, expect, vi, afterEach 
} from 'vitest'
import {
  mkdtempSync, writeFileSync, rmSync, realpathSync 
} from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  filterSourceFiles, SourceFilterError 
} from './filter-source-files'

vi.mock('../git/git-changed-files', async (importOriginal) => {
  const original = await importOriginal<typeof import('../git/git-changed-files')>()
  return {
    ...original,
    detectChangedTypeScriptFiles: vi.fn(),
  }
})

import {
  detectChangedTypeScriptFiles, GitError 
} from '../git/git-changed-files'

const mockDetectChanged = vi.mocked(detectChangedTypeScriptFiles)

function createTempDir(): string {
  return realpathSync(mkdtempSync(join(tmpdir(), 'filter-source-')))
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
    vi.restoreAllMocks()
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
      process.chdir(dir)
      const changedFile = join(dir, 'src', 'changed.ts')
      mockDetectChanged.mockReturnValue({
        files: [changedFile],
        warnings: [],
      })

      const allFiles = [join(dir, 'initial.ts'), changedFile]

      const result = filterSourceFiles(allFiles, {
        pr: true,
        base: 'main',
      })

      expect(result.files).toStrictEqual([changedFile])
    })

    it('emits warnings for untracked TypeScript files', () => {
      const dir = makeTempDir()
      process.chdir(dir)
      const committedFile = join(dir, 'committed.ts')
      mockDetectChanged.mockReturnValue({
        files: [committedFile],
        warnings: ['1 untracked TypeScript file(s) not included: untracked.ts'],
      })

      const stderrOutput: string[] = []
      const errorSpy = vi.spyOn(console, 'error').mockImplementation((msg: string) => {
        stderrOutput.push(String(msg))
      })

      filterSourceFiles([committedFile], {
        pr: true,
        base: 'main',
      })

      errorSpy.mockRestore()
      expect(stderrOutput.some((msg) => msg.includes('untracked'))).toBe(true)
    })

    it('wraps GitError in SourceFilterError with GIT_ERROR kind', () => {
      const dir = makeTempDir()
      process.chdir(dir)
      mockDetectChanged.mockImplementation(() => {
        throw new GitError('NOT_A_REPOSITORY', 'Run from within a git repository.')
      })

      const act = () => filterSourceFiles([], { pr: true })
      expect(act).toThrow(SourceFilterError)
      expect(act).toThrow(expect.objectContaining({ filterErrorKind: 'GIT_ERROR' }))
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

      const act = () => filterSourceFiles([], { files: ['nonexistent.ts'] })
      expect(act).toThrow(SourceFilterError)
      expect(act).toThrow(expect.objectContaining({ filterErrorKind: 'FILES_NOT_FOUND' }))
    })
  })
})
