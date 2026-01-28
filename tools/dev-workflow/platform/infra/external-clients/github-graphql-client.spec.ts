import {
  describe, it, expect, vi, beforeEach 
} from 'vitest'

const {
  mockGetOctokit, mockGetRepoInfo 
} = vi.hoisted(() => ({
  mockGetOctokit: vi.fn(),
  mockGetRepoInfo: vi.fn(),
}))

vi.mock('./github-rest-client', () => ({
  getOctokit: mockGetOctokit,
  getRepoInfo: mockGetRepoInfo,
}))

import { fetchRawPRFeedback } from './github-graphql-client'

describe('fetchRawPRFeedback', () => {
  const mockGraphql = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetRepoInfo.mockResolvedValue({
      owner: 'test-owner',
      repo: 'test-repo',
    })
    mockGetOctokit.mockReturnValue({ graphql: mockGraphql })
  })

  it('fetches PR feedback via GraphQL', async () => {
    mockGraphql.mockResolvedValue({
      repository: {
        pullRequest: {
          reviewThreads: {
            nodes: [
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
                      body: 'Fix this',
                    },
                  ],
                },
              },
            ],
          },
          latestOpinionatedReviews: {
            nodes: [
              {
                author: { login: 'reviewer' },
                state: 'CHANGES_REQUESTED',
              },
            ],
          },
        },
      },
    })

    const result = await fetchRawPRFeedback(123)

    expect(result.threads).toStrictEqual([
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
              body: 'Fix this',
            },
          ],
        },
      },
    ])
    expect(result.reviewDecisions).toStrictEqual([
      {
        author: { login: 'reviewer' },
        state: 'CHANGES_REQUESTED',
      },
    ])
  })

  it('calls graphql with correct parameters', async () => {
    mockGraphql.mockResolvedValue({
      repository: {
        pullRequest: {
          reviewThreads: { nodes: [] },
          latestOpinionatedReviews: { nodes: [] },
        },
      },
    })

    await fetchRawPRFeedback(456)

    expect(mockGraphql).toHaveBeenCalledWith(expect.any(String), {
      owner: 'test-owner',
      repo: 'test-repo',
      pr: 456,
    })
  })

  it('handles null latestOpinionatedReviews', async () => {
    mockGraphql.mockResolvedValue({
      repository: {
        pullRequest: {
          reviewThreads: { nodes: [] },
          latestOpinionatedReviews: null,
        },
      },
    })

    const result = await fetchRawPRFeedback(789)

    expect(result.reviewDecisions).toStrictEqual([])
  })
})
