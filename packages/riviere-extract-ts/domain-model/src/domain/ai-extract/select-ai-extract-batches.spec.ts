import { describe, expect, it } from 'vitest'
import type { AiExtractConfig } from '@living-architecture/riviere-extract-config-published-language'
import { selectAiExtractBatches } from './select-ai-extract-batches'

function makeConfig(maxFilesPerBatch: number, maxBatches: number): AiExtractConfig {
  return {
    command: 'claude',
    args: [],
    timeoutSeconds: 60,
    sources: [],
    selection: { from: ['missing-events'], componentTypes: ['Event'] },
    outputs: { addComponents: true, addLinks: true },
    context: { exclude: [], maxFilesPerBatch, maxBatches },
  }
}

describe('selectAiExtractBatches', () => {
  it('chunks file paths into batches of the configured maximum size', () => {
    const filePaths = ['a.ts', 'b.ts', 'c.ts', 'd.ts', 'e.ts']

    const result = selectAiExtractBatches(makeConfig(2, 5), filePaths)

    expect(result).toStrictEqual({
      success: true,
      batches: [
        { index: 0, filePaths: ['a.ts', 'b.ts'] },
        { index: 1, filePaths: ['c.ts', 'd.ts'] },
        { index: 2, filePaths: ['e.ts'] },
      ],
    })
  })

  it('fills exactly one batch when the file paths fit a single batch', () => {
    const filePaths = ['a.ts', 'b.ts']

    const result = selectAiExtractBatches(makeConfig(10, 5), filePaths)

    expect(result).toStrictEqual({
      success: true,
      batches: [{ index: 0, filePaths: ['a.ts', 'b.ts'] }],
    })
  })

  it('returns no batches when no file paths are loaded', () => {
    const result = selectAiExtractBatches(makeConfig(10, 5), [])

    expect(result).toStrictEqual({ success: true, batches: [] })
  })

  it('fails when the file path count exceeds the configured bound', () => {
    const filePaths = ['a.ts', 'b.ts', 'c.ts', 'd.ts', 'e.ts']

    const result = selectAiExtractBatches(makeConfig(2, 2), filePaths)

    expect(result).toStrictEqual({
      success: false,
      reason:
        "ai-extract: source scope produced 5 files, exceeds bound (max-files-per-batch * max-batches = 4). Narrow 'sources' or raise the bounds explicitly.",
    })
  })

  it('fails when the bound is zero', () => {
    const result = selectAiExtractBatches(makeConfig(0, 2), ['a.ts'])

    expect(result).toStrictEqual({
      success: false,
      reason:
        "ai-extract: source scope produced 1 files, exceeds bound (max-files-per-batch * max-batches = 0). Narrow 'sources' or raise the bounds explicitly.",
    })
  })
})
