import {
  describe, it, expect 
} from 'vitest'
import type { ExtractionConfig } from '@living-architecture/riviere-extract-config'
import { extractComponents } from './extractor'
import { createMinimalConfig } from './test-fixtures'

describe('extractComponents', () => {
  it('returns empty array when no source files provided', () => {
    const config: ExtractionConfig = createMinimalConfig()
    const result = extractComponents([], config)

    expect(result).toEqual([])
  })
})
