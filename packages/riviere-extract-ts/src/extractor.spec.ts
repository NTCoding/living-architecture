import {
  describe, it, expect 
} from 'vitest'
import type { ExtractionConfig } from '@living-architecture/riviere-extract-config'
import { Project } from 'ts-morph'
import { extractComponents } from './extractor'
import { createMinimalConfig } from './test-fixtures'

describe('extractComponents', () => {
  it('returns empty array when no source files provided', () => {
    const config: ExtractionConfig = createMinimalConfig()
    const result = extractComponents([], config)

    expect(result).toEqual([])
  })
})

describe('ts-morph integration', () => {
  it('can create Project instance for future AST parsing', () => {
    const project = new Project({ useInMemoryFileSystem: true })

    expect(project).toBeDefined()
  })
})
