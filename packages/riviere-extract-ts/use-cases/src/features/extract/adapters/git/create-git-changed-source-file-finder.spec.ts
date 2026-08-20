import { describe, expect, it, vi } from 'vitest'
import { createGitChangedSourceFileFinder } from './create-git-changed-source-file-finder'

describe('createGitChangedSourceFileFinder', () => {
  it('maps the domain port to the Git client with an explicit base branch', () => {
    const detectChangedFiles = vi.fn(() => ({ files: ['/project/changed.ts'], warnings: [] }))
    const findChangedSourceFiles = createGitChangedSourceFileFinder('/project', detectChangedFiles)

    expect(findChangedSourceFiles('main')).toStrictEqual({
      filePaths: ['/project/changed.ts'],
      warnings: [],
    })
    expect(detectChangedFiles).toHaveBeenCalledWith('/project', { base: 'main' })
  })

  it('uses the Git client default base branch when the domain has none', () => {
    const detectChangedFiles = vi.fn(() => ({ files: ['/project/changed.ts'], warnings: [] }))
    const findChangedSourceFiles = createGitChangedSourceFileFinder('/project', detectChangedFiles)

    expect(findChangedSourceFiles(undefined)).toStrictEqual({
      filePaths: ['/project/changed.ts'],
      warnings: [],
    })
    expect(detectChangedFiles).toHaveBeenCalledWith('/project', {})
  })
})
