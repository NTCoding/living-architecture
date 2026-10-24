import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { findAiExtractSourceFiles } from './find-ai-extract-source-files'

describe('findAiExtractSourceFiles directory expansion', () => {
  const created: string[] = []

  afterEach(() => {
    for (const directory of created.splice(0)) {
      rmSync(directory, { force: true, recursive: true })
    }
  })

  it('expands a directory source into nested files', () => {
    const root = mkdtempSync(join(tmpdir(), 'ai-extract-sources-'))
    created.push(root)
    mkdirSync(join(root, 'nested'), { recursive: true })
    writeFileSync(join(root, 'top.ts'), 'top')
    writeFileSync(join(root, 'nested', 'inner.ts'), 'inner')

    const result = findAiExtractSourceFiles([root], [])

    expect(result).toStrictEqual([join(root, 'nested', 'inner.ts'), join(root, 'top.ts')])
  })
})
