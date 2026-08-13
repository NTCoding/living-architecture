import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach } from 'vitest'

export interface TestContext {
  testDir: string
  originalCwd: string
}

export function createTestContext(): TestContext {
  return { originalCwd: '', testDir: '' }
}

export function setupCommandTest(ctx: TestContext): void {
  beforeEach(async () => {
    ctx.testDir = await mkdtemp(join(tmpdir(), 'riviere-test-'))
    ctx.originalCwd = process.cwd()
    process.chdir(ctx.testDir)
  })

  afterEach(async () => {
    process.chdir(ctx.originalCwd)
    await rm(ctx.testDir, { force: true, recursive: true })
  })
}
