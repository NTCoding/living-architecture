import { describe, expect, it, vi } from 'vitest'
import { createSpecifiedSourceFileFinder } from './create-specified-source-file-finder'
describe('createSpecifiedSourceFileFinder', () => {
  it('maps the port to the filesystem client', () => {
    const findFiles = vi.fn(() => ({ filePaths: ['/project/a.ts'], missingFilePaths: [] }))
    expect(createSpecifiedSourceFileFinder('/project', findFiles)(['a.ts'])).toStrictEqual({
      filePaths: ['/project/a.ts'],
      missingFilePaths: [],
    })
    expect(findFiles).toHaveBeenCalledWith('/project', ['a.ts'])
  })
})
