import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  afterEach, describe, expect, it, vi 
} from 'vitest'
import { findFileUp } from './find-file-up'

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>()
  return {
    ...actual,
    existsSync: vi.fn(actual.existsSync),
  }
})

import { existsSync } from 'node:fs'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

describe('findFileUp', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns the path when the file exists in the start directory', () => {
    const result = findFileUp(currentDir, 'find-file-up.ts')
    expect(result).toBe(path.join(currentDir, 'find-file-up.ts'))
  })

  it('walks up directories to find the file', () => {
    const result = findFileUp(currentDir, 'package.json')
    expect(result).toContain('riviere-role-enforcement')
    expect(result).toContain('package.json')
  })

  it('returns undefined when the file does not exist anywhere', () => {
    vi.mocked(existsSync).mockReturnValue(false)
    const result = findFileUp('/some/deep/path', 'nonexistent-file.xyz')
    expect(result).toBeUndefined()
  })
})
