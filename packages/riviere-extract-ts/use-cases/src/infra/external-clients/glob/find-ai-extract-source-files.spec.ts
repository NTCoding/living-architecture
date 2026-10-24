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

  it('sorts paths that arrive in reverse order', () => {
    vi.mocked(globSync).mockReturnValue(['z.ts', 'a.ts'])

    const result = findAiExtractSourceFiles(['./src'], [])

    expect(result).toStrictEqual(['a.ts', 'z.ts'])
  })
})
