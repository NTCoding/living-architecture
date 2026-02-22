import {
  mkdirSync, writeFileSync, rmSync 
} from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  describe, it, expect, afterEach 
} from 'vitest'
import { findModuleTsConfigDir } from './find-module-tsconfig-dir'

function createTestDir(): string {
  const dir = join(tmpdir(), `find-module-tsconfig-dir-test-${Date.now()}`)
  mkdirSync(dir, { recursive: true })
  return dir
}

describe('findModuleTsConfigDir', () => {
  const dirs: string[] = []

  afterEach(() => {
    for (const dir of dirs) {
      rmSync(dir, {
        recursive: true,
        force: true,
      })
    }
    dirs.length = 0
  })

  it('returns module directory when module has its own tsconfig', () => {
    const testDir = createTestDir()
    dirs.push(testDir)
    const moduleDir = join(testDir, 'shipping-domain')
    mkdirSync(moduleDir, { recursive: true })
    writeFileSync(join(moduleDir, 'tsconfig.json'), '{}')

    const result = findModuleTsConfigDir(testDir, 'shipping-domain')

    expect(result).toBe(moduleDir)
  })

  it('returns config directory when module has no tsconfig', () => {
    const testDir = createTestDir()
    dirs.push(testDir)
    const moduleDir = join(testDir, 'orders-domain')
    mkdirSync(moduleDir, { recursive: true })

    const result = findModuleTsConfigDir(testDir, 'orders-domain')

    expect(result).toBe(testDir)
  })
})
