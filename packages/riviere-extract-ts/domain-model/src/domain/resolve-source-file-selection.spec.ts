import { describe, expect, it, vi } from 'vitest'
import { RequestedSourceFilesNotFoundError } from './requested-source-files-not-found-error'
import { resolveSourceFileSelection } from './resolve-source-file-selection'

describe('resolveSourceFileSelection', () => {
  const findChangedSourceFiles = vi.fn(() => ({
    filePaths: ['src/orders/changed.ts'],
    warnings: ['Untracked TypeScript files were not included.'],
  }))
  const findSpecifiedSourceFiles = vi.fn((filePaths: readonly string[]) => ({
    filePaths,
    missingFilePaths: [],
  }))

  it('selects all source files without calling a port', () => {
    expect(
      resolveSourceFileSelection({ kind: 'all' }, findChangedSourceFiles, findSpecifiedSourceFiles),
    ).toStrictEqual({ sourceFileSelection: { kind: 'all' }, warnings: [] })
    expect(findChangedSourceFiles).not.toHaveBeenCalled()
    expect(findSpecifiedSourceFiles).not.toHaveBeenCalled()
  })

  it('selects specified source files through its port', () => {
    expect(
      resolveSourceFileSelection(
        { kind: 'files', filePaths: ['src/orders/order.ts'] },
        findChangedSourceFiles,
        findSpecifiedSourceFiles,
      ),
    ).toStrictEqual({
      sourceFileSelection: { kind: 'files', filePaths: ['src/orders/order.ts'] },
      warnings: [],
    })
  })

  it('rejects specified files that the port cannot find', () => {
    const findFiles = vi.fn(() => ({
      filePaths: ['src/orders/missing.ts'],
      missingFilePaths: ['src/orders/missing.ts'],
    }))

    expect(() =>
      resolveSourceFileSelection(
        { kind: 'files', filePaths: ['src/orders/missing.ts'] },
        findChangedSourceFiles,
        findFiles,
      ),
    ).toThrow(new RequestedSourceFilesNotFoundError(['src/orders/missing.ts']))
  })

  it('selects changed source files and returns their warnings', () => {
    expect(
      resolveSourceFileSelection(
        { kind: 'changed', baseBranch: 'main' },
        findChangedSourceFiles,
        findSpecifiedSourceFiles,
      ),
    ).toStrictEqual({
      sourceFileSelection: { kind: 'files', filePaths: ['src/orders/changed.ts'] },
      warnings: ['Untracked TypeScript files were not included.'],
    })
    expect(findChangedSourceFiles).toHaveBeenCalledWith('main')
  })
})
