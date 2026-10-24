import { describe, expect, it } from 'vitest'
import type { AiExtractConfig } from '@living-architecture/riviere-extract-config-published-language'
import { selectAiExtractBatches } from './select-ai-extract-batches'
import type { AiExtractSourceFile } from '../ports/load-ai-extract-sources'

function file(path: string): AiExtractSourceFile {
  return { path, content: `content of ${path}` }
}

function makeConfig(maxFilesPerBatch: number, maxBatches: number): AiExtractConfig {
  return {
    command: 'claude',
    args: [],
    timeoutSeconds: 60,
    sources: ['src/**/*.ts'],
    selection: { from: ['missing-events'], componentTypes: ['Event'] },
    outputs: { addComponents: true, addLinks: true },
    context: { exclude: [], maxFilesPerBatch, maxBatches },
  }
}

describe('selectAiExtractBatches', () => {
  it('chunks files into batches of the configured maximum size', () => {
    const files = ['a.ts', 'b.ts', 'c.ts', 'd.ts', 'e.ts'].map(file)

    const result = selectAiExtractBatches(makeConfig(2, 3), files)

    expect(result).toStrictEqual({
      success: true,
      batches: [
        { index: 0, files: [file('a.ts'), file('b.ts')] },
        { index: 1, files: [file('c.ts'), file('d.ts')] },
        { index: 2, files: [file('e.ts')] },
      ],
    })
  })

  it('fills exactly one batch when the files fit a single batch', () => {
    const files = ['a.ts', 'b.ts'].map(file)

    const result = selectAiExtractBatches(makeConfig(10, 5), files)

    expect(result).toStrictEqual({ success: true, batches: [{ index: 0, files }] })
  })

  it('returns empty batches when no files are loaded', () => {
    const result = selectAiExtractBatches(makeConfig(10, 2), [])

    expect(result).toStrictEqual({ success: true, batches: [] })
  })

  it('fails with the bound message when the files exceed every batch', () => {
    const files = ['a.ts', 'b.ts', 'c.ts', 'd.ts', 'e.ts'].map(file)

    const result = selectAiExtractBatches(makeConfig(2, 2), files)

    expect(result).toStrictEqual({
      success: false,
      reason:
        "ai-extract: source scope produced 5 files, exceeds bound (max-files-per-batch * max-batches = 4). Narrow 'sources' or raise the bounds explicitly.",
    })
  })

  it('fails when the files exceed the bound even with a single batch allowed', () => {
    const result = selectAiExtractBatches(makeConfig(10, 0), [file('a.ts')])

    expect(result).toStrictEqual({
      success: false,
      reason:
        "ai-extract: source scope produced 1 files, exceeds bound (max-files-per-batch * max-batches = 0). Narrow 'sources' or raise the bounds explicitly.",
    })
  })
})
