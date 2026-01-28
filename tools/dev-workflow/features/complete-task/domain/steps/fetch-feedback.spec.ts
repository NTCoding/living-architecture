import {
  describe, it, expect, vi, beforeEach 
} from 'vitest'

const { mockGetPRFeedback } = vi.hoisted(() => ({ mockGetPRFeedback: vi.fn() }))

vi.mock('../../../../platform/domain/review-feedback/get-pr-feedback', () => ({getPRFeedback: mockGetPRFeedback,}))

import { fetchPRFeedback } from './fetch-feedback'
import type { CompleteTaskContext } from '../task-to-complete'

function createContext(overrides: Partial<CompleteTaskContext> = {}): CompleteTaskContext {
  return {
    branch: 'test-branch',
    reviewDir: './test-review',
    hasIssue: false,
    commitMessage: 'test commit',
    prTitle: 'test title',
    prBody: 'test body',
    ...overrides,
  }
}

describe('fetchPRFeedback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns failure when no PR number', async () => {
    const ctx = createContext({ prNumber: undefined })

    const result = await fetchPRFeedback.execute(ctx)

    expect(result.type).toBe('failure')
  })

  it('returns success when no feedback', async () => {
    mockGetPRFeedback.mockResolvedValue({
      reviewDecisions: [],
      threads: [],
    })
    const ctx = createContext({ prNumber: 123 })

    const result = await fetchPRFeedback.execute(ctx)

    expect(result.type).toBe('success')
  })

  it('returns failure when changes requested', async () => {
    mockGetPRFeedback.mockResolvedValue({
      reviewDecisions: [
        {
          state: 'CHANGES_REQUESTED',
          reviewer: 'reviewer1',
        },
      ],
      threads: [],
    })
    const ctx = createContext({ prNumber: 123 })

    const result = await fetchPRFeedback.execute(ctx)

    expect(result.type).toBe('failure')
  })

  it('returns failure when unresolved threads exist', async () => {
    mockGetPRFeedback.mockResolvedValue({
      reviewDecisions: [],
      threads: [
        {
          location: 'file.ts:10',
          body: 'Please fix this',
        },
      ],
    })
    const ctx = createContext({ prNumber: 123 })

    const result = await fetchPRFeedback.execute(ctx)

    expect(result.type).toBe('failure')
  })

  it('truncates long thread bodies in summary', async () => {
    const longBody = 'x'.repeat(150)
    mockGetPRFeedback.mockResolvedValue({
      reviewDecisions: [],
      threads: [
        {
          location: 'file.ts:10',
          body: longBody,
        },
      ],
    })
    const ctx = createContext({ prNumber: 123 })

    const result = await fetchPRFeedback.execute(ctx)

    expect(result.type).toBe('failure')
  })
})
