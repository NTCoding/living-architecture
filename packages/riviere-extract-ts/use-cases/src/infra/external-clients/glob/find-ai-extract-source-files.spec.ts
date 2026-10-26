import { describe, expect, it, vi } from 'vitest'
import { findAiExtractSourceFiles } from './find-ai-extract-source-files'

vi.mock('glob', () => ({ globSync: vi.fn() }))

import { globSync } from 'glob'

function echoPatterns(patterns: string | string[]): string[] {
  return typeof patterns === 'string' ? [patterns] : [...patterns]
}

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

  it('passes a missing source through verbatim without expanding it', () => {
    vi.mocked(globSync).mockImplementation(echoPatterns)

    const result = findAiExtractSourceFiles(['/definitely/missing/path'], [])

    expect(globSync).toHaveBeenCalledWith(
      ['/definitely/missing/path'],
      expect.objectContaining({ nodir: true }),
    )
    expect(result).toStrictEqual(['/definitely/missing/path'])
  })

  it('passes an existing file source through verbatim without expanding it', () => {
    vi.mocked(globSync).mockImplementation(echoPatterns)

    const result = findAiExtractSourceFiles(['package.json'], [])

    expect(globSync).toHaveBeenCalledWith(
      ['package.json'],
      expect.objectContaining({ nodir: true }),
    )
    expect(result).toStrictEqual(['package.json'])
  })

  it('expands a directory source with a trailing slash', () => {
    vi.mocked(globSync).mockReturnValue(['nested/inner.ts'])

    const result = findAiExtractSourceFiles(['./src/'], [])

    expect(globSync).toHaveBeenCalledWith(['./src/**/*'], expect.objectContaining({ nodir: true }))
    expect(result).toStrictEqual(['nested/inner.ts'])
  })

  it('expands a directory exclude so its files are ignored', () => {
    vi.mocked(globSync).mockReturnValue([])

    findAiExtractSourceFiles(['src'], ['src'])

    expect(globSync).toHaveBeenCalledWith(
      ['src/**/*'],
      expect.objectContaining({ ignore: ['src/**/*'] }),
    )
  })

  it('sorts paths that arrive in reverse order', () => {
    vi.mocked(globSync).mockReturnValue(['z.ts', 'a.ts'])

    const result = findAiExtractSourceFiles(['./src'], [])

    expect(result).toStrictEqual(['a.ts', 'z.ts'])
  })
})
