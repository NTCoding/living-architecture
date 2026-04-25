import { join } from 'node:path'
import {
  afterEach, beforeEach, describe, expect, it 
} from 'vitest'
import { fileExists } from './file-existence'
import {
  mkdtemp, rm 
} from 'node:fs/promises'
import { tmpdir } from 'node:os'

interface TestContext {testDir: string}

describe('fileExists', () => {
  const ctx: TestContext = { testDir: '' }

  beforeEach(async () => {
    ctx.testDir = await mkdtemp(join(tmpdir(), 'riviere-test-'))
  })

  afterEach(async () => {
    if (ctx.testDir !== '') {
      await rm(ctx.testDir, {
        recursive: true,
        force: true,
      })
    }
  })

  it('returns false for missing files', () => {
    expect(fileExists(join(ctx.testDir, 'missing.txt'))).toBe(false)
  })

  it('rethrows non-ENOENT errors', () => {
    expect(() => fileExists('\0')).toThrow('path')
  })
})
