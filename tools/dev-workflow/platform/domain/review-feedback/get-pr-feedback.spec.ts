import {
  describe, it, expect, vi, beforeEach 
} from 'vitest'

const { mockFetchRawPRFeedback } = vi.hoisted(() => ({ mockFetchRawPRFeedback: vi.fn() }))

vi.mock('../../infra/external-clients/github-graphql-client', () => ({fetchRawPRFeedback: mockFetchRawPRFeedback,}))

import { getPRFeedback } from './get-pr-feedback'

describe('getPRFeedback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns formatted threads and review decisions', async () => {
    mockFetchRawPRFeedback.mockResolvedValue({
      threads: [
        {
          id: 'thread-1',
          isResolved: false,
          isOutdated: false,
          path: 'src/file.ts',
          line: 42,
          comments: {
            nodes: [
              {
                author: { login: 'reviewer' },
                body: 'Comment',
              },
            ],
          },
        },
      ],
      reviewDecisions: [
        {
          author: { login: 'coderabbitai' },
          state: 'APPROVED',
        },
      ],
    })

    const result = await getPRFeedback(123)

    expect(result.threads).toHaveLength(1)
    expect(result.threads[0]).toMatchObject({
      threadId: 'thread-1',
      location: 'src/file.ts:42',
      author: 'reviewer',
      body: 'Comment',
    })
    expect(result.reviewDecisions).toHaveLength(1)
    expect(result.reviewDecisions[0]).toMatchObject({
      reviewer: 'coderabbitai',
      state: 'APPROVED',
    })
  })

  it('filters out resolved threads by default', async () => {
    mockFetchRawPRFeedback.mockResolvedValue({
      threads: [
        {
          id: 'active',
          isResolved: false,
          isOutdated: false,
          path: 'file.ts',
          line: 1,
          comments: {
            nodes: [
              {
                author: { login: 'a' },
                body: 'b',
              },
            ],
          },
        },
        {
          id: 'resolved',
          isResolved: true,
          isOutdated: false,
          path: 'file.ts',
          line: 2,
          comments: {
            nodes: [
              {
                author: { login: 'a' },
                body: 'b',
              },
            ],
          },
        },
      ],
      reviewDecisions: [],
    })

    const result = await getPRFeedback(123)

    expect(result.threads).toHaveLength(1)
    expect(result.threads[0]?.threadId).toStrictEqual('active')
  })

  it('includes resolved threads when option is set', async () => {
    mockFetchRawPRFeedback.mockResolvedValue({
      threads: [
        {
          id: 'active',
          isResolved: false,
          isOutdated: false,
          path: 'file.ts',
          line: 1,
          comments: {
            nodes: [
              {
                author: { login: 'a' },
                body: 'b',
              },
            ],
          },
        },
        {
          id: 'resolved',
          isResolved: true,
          isOutdated: false,
          path: 'file.ts',
          line: 2,
          comments: {
            nodes: [
              {
                author: { login: 'a' },
                body: 'b',
              },
            ],
          },
        },
      ],
      reviewDecisions: [],
    })

    const result = await getPRFeedback(123, { includeResolved: true })

    expect(result.threads).toHaveLength(2)
  })

  it('filters out threads with no comments', async () => {
    mockFetchRawPRFeedback.mockResolvedValue({
      threads: [
        {
          id: 'empty',
          isResolved: false,
          isOutdated: false,
          path: 'file.ts',
          line: 1,
          comments: { nodes: [] },
        },
      ],
      reviewDecisions: [],
    })

    const result = await getPRFeedback(123)

    expect(result.threads).toHaveLength(0)
  })

  it('handles null author in review decisions', async () => {
    mockFetchRawPRFeedback.mockResolvedValue({
      threads: [],
      reviewDecisions: [
        {
          author: null,
          state: 'APPROVED',
        },
      ],
    })

    const result = await getPRFeedback(123)

    expect(result.reviewDecisions[0]?.reviewer).toStrictEqual('[deleted]')
  })
})
