import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createAiExtractSourceFileReader } from './ai-extract-source-file-reader'

describe('createAiExtractSourceFileReader', () => {
  const directories: string[] = []

  afterEach(() => {
    for (const directory of directories.splice(0)) {
      rmSync(directory, { recursive: true, force: true })
    }
  })

  it('reads each requested file path into a source file', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'ai-extract-reader-'))
    directories.push(directory)
    const firstPath = join(directory, 'a.ts')
    const secondPath = join(directory, 'b.ts')
    writeFileSync(firstPath, 'first content')
    writeFileSync(secondPath, 'second content')

    const reader = createAiExtractSourceFileReader()
    const result = await reader([firstPath, secondPath])

    expect(result).toStrictEqual([
      { filePath: firstPath, content: 'first content' },
      { filePath: secondPath, content: 'second content' },
    ])
  })

  it('returns an empty list for no paths', async () => {
    const reader = createAiExtractSourceFileReader()
    const result = await reader([])

    expect(result).toStrictEqual([])
  })
})
