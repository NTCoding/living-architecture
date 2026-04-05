import { join } from 'node:path'
import {
  describe, expect, it 
} from 'vitest'
import { fileExists } from './file-existence'
import {
  type TestContext,
  createTestContext,
  setupCommandTest,
} from '../../../__fixtures__/command-test-fixtures'

describe('fileExists', () => {
  const ctx: TestContext = createTestContext()
  setupCommandTest(ctx)

  it('returns false for missing files', () => {
    expect(fileExists(join(ctx.testDir, 'missing.txt'))).toBe(false)
  })

  it('rethrows non-ENOENT errors', () => {
    expect(() => fileExists('\0')).toThrow('path')
  })
})
