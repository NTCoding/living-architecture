import { describe, expect, it, vi } from 'vitest'
import { findAiExtractSourceFiles } from './find-ai-extract-source-files'

vi.mock('glob', () => ({ globSync: vi.fn() }))

import { globSync } from 'glob'

describe('findAiExtractSourceFiles', () => {
  it('sorts discovered paths by code point rather than locale', () => {
    vi.mocked(globSync).mockReturnValue(['a/b.ts', 'a/B.ts', 'a.b.ts', 'a-b.ts'])

    const result = findAiExtractSourceFiles(['./src'], [])

    expect(result).toStrictEqual(['a-b.ts', 'a.b.ts', 'a/B.ts', 'a/b.ts'])
  })

  it('returns equal paths without reordering them', () => {
    vi.mocked(globSync).mockReturnValue(['same.ts', 'same.ts'])

    const result = findAiExtractSourceFiles(['./src'], [])

    expect(result).toStrictEqual(['same.ts', 'same.ts'])
  })

  it('passes through missing sources', () => {
    vi.mocked(globSync).mockReturnValue([])

    const result = findAiExtractSourceFiles(['/definitely/missing/path'], [])

    expect(result).toStrictEqual([])
  })

  it('passes through existing file sources', () => {
    vi.mocked(globSync).mockReturnValue([])

    const result = findAiExtractSourceFiles(['package.json'], [])

    expect(result).toStrictEqual([])
  })

  it('expands a directory source with a trailing slash', () => {
    vi.mocked(globSync).mockReturnValue(['nested/inner.ts'])

    const result = findAiExtractSourceFiles(['./src/'], [])

    expect(result).toStrictEqual(['nested/inner.ts'])
  })

  it('sorts paths that arrive in reverse order', () => {
    vi.mocked(globSync).mockReturnValue(['z.ts', 'a.ts'])

    const result = findAiExtractSourceFiles(['./src'], [])

    expect(result).toStrictEqual(['a.ts', 'z.ts'])
  })
})
