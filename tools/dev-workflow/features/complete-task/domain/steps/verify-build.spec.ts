import {
  describe, it, expect, vi, beforeEach 
} from 'vitest'

const { mockNx } = vi.hoisted(() => ({ mockNx: { runMany: vi.fn() } }))

vi.mock('../../../../platform/infra/external-clients/nx-runner', () => ({ nx: mockNx }))

import { verifyBuild } from './verify-build'
import type { CompleteTaskContext } from '../task-to-complete'

function createContext(): CompleteTaskContext {
  return {
    branch: 'test-branch',
    reviewDir: './test-review',
    hasIssue: false,
    commitMessage: 'test commit',
    prTitle: 'test title',
    prBody: 'test body',
  }
}

describe('verifyBuild', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('runs lint, typecheck, and test targets', async () => {
    mockNx.runMany.mockResolvedValue({
      failed: false,
      output: '',
    })
    const ctx = createContext()

    await verifyBuild.execute(ctx)

    expect(mockNx.runMany).toHaveBeenCalledWith(['lint', 'typecheck', 'test'])
  })

  it('returns success when build passes', async () => {
    mockNx.runMany.mockResolvedValue({
      failed: false,
      output: 'all passed',
    })
    const ctx = createContext()

    const result = await verifyBuild.execute(ctx)

    expect(result.type).toBe('success')
  })

  it('returns failure when build fails', async () => {
    mockNx.runMany.mockResolvedValue({
      failed: true,
      output: 'lint errors',
    })
    const ctx = createContext()

    const result = await verifyBuild.execute(ctx)

    expect(result.type).toBe('failure')
  })
})
