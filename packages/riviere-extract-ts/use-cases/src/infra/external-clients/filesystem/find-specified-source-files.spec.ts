import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { findSpecifiedSourceFiles } from './find-specified-source-files'
describe('findSpecifiedSourceFiles', () => {
  it('resolves existing and missing paths', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'source-files-'))
    await writeFile(join(directory, 'present.ts'), '')
    expect(findSpecifiedSourceFiles(directory, ['present.ts', 'missing.ts'])).toStrictEqual({
      filePaths: [join(directory, 'present.ts'), join(directory, 'missing.ts')],
      missingFilePaths: [join(directory, 'missing.ts')],
    })
    await rm(directory, { recursive: true })
  })
})
