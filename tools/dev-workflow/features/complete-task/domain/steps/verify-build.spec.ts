import {
  describe, it, expect, vi, beforeEach 
} from 'vitest'
import { createVerifyBuildStep } from './verify-build'
import type { CompleteTaskContext } from '../task-to-complete'

const mockRunMany = vi.fn()

const verifyBuild = createVerifyBuildStep({ runMany: mockRunMany })

function createContext(): CompleteTaskContext {
  return {
    branch: 'test-branch',
    reviewDir: './test-review',
    hasIssue: false,
    prTitle: 'test title',
    prBody: 'test body',
  }
}

describe('verifyBuild', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('runs lint, typecheck, and test targets', async () => {
    mockRunMany.mockResolvedValue({
      failed: false,
      output: '',
    })
    const ctx = createContext()

    await verifyBuild.execute(ctx)

    expect(mockRunMany).toHaveBeenCalledWith(['lint', 'typecheck', 'test'])
  })

  it('returns success when build passes', async () => {
    mockRunMany.mockResolvedValue({
      failed: false,
      output: 'all passed',
    })
    const ctx = createContext()

    const result = await verifyBuild.execute(ctx)

    expect(result.type).toBe('success')
  })

  it('returns failure when build fails', async () => {
    mockRunMany.mockResolvedValue({
      failed: true,
      output: 'lint errors',
    })
    const ctx = createContext()

    const result = await verifyBuild.execute(ctx)

    expect(result.type).toBe('failure')
  })
})
