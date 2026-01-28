import {
  describe, it, expect, vi, beforeEach 
} from 'vitest'

const {
  mockGitHub, mockGetPRFeedback 
} = vi.hoisted(() => ({
  mockGitHub: { getMergeableState: vi.fn() },
  mockGetPRFeedback: vi.fn(),
}))

vi.mock('../../../../platform/infra/external-clients/github-rest-client', () => ({github: mockGitHub,}))
vi.mock('../../../../platform/domain/review-feedback/get-pr-feedback', () => ({getPRFeedback: mockGetPRFeedback,}))

import { fetchFeedback } from './fetch-feedback'
import type { GetPRFeedbackContext } from '../feedback-report'
import type { StepResult } from '../../../../platform/domain/workflow-execution/step-result'

function createContext(overrides: Partial<GetPRFeedbackContext> = {}): GetPRFeedbackContext {
  return {
    branch: 'feature',
    includeResolved: false,
    ...overrides,
  }
}

class TestAssertionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TestAssertionError'
  }
}

function assertSuccess(result: StepResult): asserts result is {
  type: 'success'
  output?: unknown
} {
  if (result.type !== 'success') {
    throw new TestAssertionError(`Expected success, got ${result.type}`)
  }
}

describe('fetchFeedback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGitHub.getMergeableState.mockResolvedValue('clean')
    mockGetPRFeedback.mockResolvedValue({
      reviewDecisions: [],
      threads: [],
    })
  })

  it('returns not_found state when no PR number', async () => {
    const ctx = createContext({ prNumber: undefined })

    const result = await fetchFeedback.execute(ctx)

    assertSuccess(result)
    expect(result.output).toHaveProperty('state', 'not_found')
  })

  it('returns merged state without fetching feedback when merged', async () => {
    const ctx = createContext({
      prNumber: 123,
      prState: 'merged',
      prUrl: 'https://pr/123',
      includeResolved: false,
    })

    const result = await fetchFeedback.execute(ctx)

    expect(mockGetPRFeedback).not.toHaveBeenCalled()
    assertSuccess(result)
    expect(result.output).toHaveProperty('state', 'merged')
  })

  it('fetches feedback for merged PR when includeResolved true', async () => {
    const ctx = createContext({
      prNumber: 123,
      prState: 'merged',
      prUrl: 'https://pr/123',
      includeResolved: true,
    })

    await fetchFeedback.execute(ctx)

    expect(mockGetPRFeedback).toHaveBeenCalledWith(123, { includeResolved: true })
  })

  it('returns mergeable true when clean and no feedback', async () => {
    const ctx = createContext({
      prNumber: 123,
      prState: 'open',
      prUrl: 'https://pr/123',
    })

    const result = await fetchFeedback.execute(ctx)

    assertSuccess(result)
    expect(result.output).toHaveProperty('mergeable', true)
  })

  it('returns mergeable false when changes requested', async () => {
    mockGetPRFeedback.mockResolvedValue({
      reviewDecisions: [
        {
          state: 'CHANGES_REQUESTED',
          reviewer: 'r1',
        },
      ],
      threads: [],
    })
    const ctx = createContext({
      prNumber: 123,
      prState: 'open',
      prUrl: 'https://pr/123',
    })

    const result = await fetchFeedback.execute(ctx)

    assertSuccess(result)
    expect(result.output).toHaveProperty('mergeable', false)
  })

  it('returns mergeable false when unresolved threads exist', async () => {
    mockGetPRFeedback.mockResolvedValue({
      reviewDecisions: [],
      threads: [{ body: 'fix this' }],
    })
    const ctx = createContext({
      prNumber: 123,
      prState: 'open',
      prUrl: 'https://pr/123',
    })

    const result = await fetchFeedback.execute(ctx)

    assertSuccess(result)
    expect(result.output).toHaveProperty('mergeable', false)
  })
})
