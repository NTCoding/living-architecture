import {
  describe, it, expect, vi 
} from 'vitest'
import { createGetPrFeedback } from './get-pr-feedback'

const REPO_INFO = JSON.stringify({
  owner: { login: 'TestOwner' },
  name: 'test-repo',
})

function graphqlResponse(
  threads: readonly object[],
  overrides: Partial<{
    reviewDecision: string | null
    reviews: readonly object[]
  }> = {},
): string {
  return JSON.stringify({
    data: {
      repository: {
        pullRequest: {
          reviewDecision: overrides.reviewDecision ?? null,
          reviews: { nodes: overrides.reviews ?? [] },
          reviewThreads: { nodes: threads },
        },
      },
    },
  })
}

function makeThread(
  overrides: Partial<{
    id: string
    isResolved: boolean
    isOutdated: boolean
    path: string | null
    line: number | null
    comments: {
      nodes: readonly {
        author: { login: string } | null
        body: string
        url?: string
      }[]
    }
  }> = {},
): object {
  return {
    id: 'thread-1',
    isResolved: false,
    isOutdated: false,
    path: 'src/foo.ts',
    line: 10,
    comments: {
      nodes: [
        {
          author: { login: 'reviewer' },
          body: 'fix this',
          url: 'https://github.com/test/repo/pull/1#discussion_r1',
        },
      ],
    },
    ...overrides,
  }
}

function makeReview(login: string, state: string): object {
  return {
    author: { login },
    state,
  }
}

describe('createGetPrFeedback', () => {
  it('calls gh with repo view then graphql api', () => {
    const runGh = vi.fn().mockReturnValueOnce(REPO_INFO).mockReturnValueOnce(graphqlResponse([]))
    const getPrFeedback = createGetPrFeedback(runGh)
    getPrFeedback(42)
    expect(runGh).toHaveBeenCalledWith('repo view --json owner,name')
    expect(runGh).toHaveBeenCalledWith(expect.stringContaining('api graphql -f query='))
    expect(runGh).toHaveBeenCalledWith(expect.stringContaining('pullRequest(number: 42)'))
  })

  it('uses owner and repo from gh repo view in graphql query', () => {
    const runGh = vi.fn().mockReturnValueOnce(REPO_INFO).mockReturnValueOnce(graphqlResponse([]))
    const getPrFeedback = createGetPrFeedback(runGh)
    getPrFeedback(1)
    const graphqlCall = String(runGh.mock.calls[1]?.[0])
    expect(
      [
        'owner: "TestOwner"',
        'name: "test-repo"',
        'reviewDecision',
        'reviews(first: 100)',
        'reviewThreads(first: 100)',
      ].every((fragment) => graphqlCall.includes(fragment)),
    ).toBe(true)
  })

  it('returns zero unresolved when all threads are resolved or outdated', () => {
    const runGh = vi
      .fn()
      .mockReturnValueOnce(REPO_INFO)
      .mockReturnValueOnce(
        graphqlResponse([
          makeThread({
            id: 't1',
            isResolved: true,
          }),
          makeThread({
            id: 't2',
            isOutdated: true,
          }),
        ]),
      )
    const getPrFeedback = createGetPrFeedback(runGh)
    const result = getPrFeedback(1)
    expect(result.unresolvedCount).toBe(0)
    expect(result.threads).toHaveLength(0)
  })

  it('filters to only unresolved non-outdated threads', () => {
    const runGh = vi
      .fn()
      .mockReturnValueOnce(REPO_INFO)
      .mockReturnValueOnce(
        graphqlResponse([
          makeThread({
            id: 't1',
            isResolved: false,
            isOutdated: false,
          }),
          makeThread({
            id: 't2',
            isResolved: true,
            isOutdated: false,
          }),
          makeThread({
            id: 't3',
            isResolved: false,
            isOutdated: true,
          }),
          makeThread({
            id: 't4',
            isResolved: false,
            isOutdated: false,
          }),
        ]),
      )
    const getPrFeedback = createGetPrFeedback(runGh)
    const result = getPrFeedback(1)
    expect(result.unresolvedCount).toBe(2)
    expect(result.threads).toHaveLength(2)
    expect(result.threads.map((t) => t.id)).toStrictEqual(['t1', 't4'])
  })

  it('returns reviewDecision and detects a submitted CodeRabbit review', () => {
    const runGh = vi
      .fn()
      .mockReturnValueOnce(REPO_INFO)
      .mockReturnValueOnce(
        graphqlResponse([], {
          reviewDecision: 'CHANGES_REQUESTED',
          reviews: [makeReview('coderabbitai', 'CHANGES_REQUESTED')],
        }),
      )
    const getPrFeedback = createGetPrFeedback(runGh)
    const result = getPrFeedback(1)
    expect(result.reviewDecision).toBe('CHANGES_REQUESTED')
    expect(result.coderabbitReviewSeen).toBe(true)
  })

  it('detects a submitted CodeRabbit bot review', () => {
    const runGh = vi
      .fn()
      .mockReturnValueOnce(REPO_INFO)
      .mockReturnValueOnce(
        graphqlResponse([], { reviews: [makeReview('coderabbitai[bot]', 'APPROVED')] }),
      )
    const getPrFeedback = createGetPrFeedback(runGh)
    const result = getPrFeedback(1)
    expect(result.coderabbitReviewSeen).toBe(true)
  })

  it('returns empty when no review threads exist', () => {
    const runGh = vi.fn().mockReturnValueOnce(REPO_INFO).mockReturnValueOnce(graphqlResponse([]))
    const getPrFeedback = createGetPrFeedback(runGh)
    const result = getPrFeedback(1)
    expect(result.unresolvedCount).toBe(0)
    expect(result.threads).toHaveLength(0)
    expect(result.coderabbitReviewSeen).toBe(false)
  })

  it('throws when graphql output is invalid JSON', () => {
    const runGh = vi.fn().mockReturnValueOnce(REPO_INFO).mockReturnValueOnce('not json')
    const getPrFeedback = createGetPrFeedback(runGh)
    expect(() => getPrFeedback(1)).toThrow('Unexpected token')
  })

  it('throws when graphql output has unexpected shape', () => {
    const runGh = vi
      .fn()
      .mockReturnValueOnce(REPO_INFO)
      .mockReturnValueOnce(JSON.stringify({ wrong: 'shape' }))
    const getPrFeedback = createGetPrFeedback(runGh)
    expect(() => getPrFeedback(1)).toThrow('Required')
  })

  it('flattens comments.nodes into comments array', () => {
    const runGh = vi
      .fn()
      .mockReturnValueOnce(REPO_INFO)
      .mockReturnValueOnce(
        graphqlResponse([
          makeThread({
            id: 't1',
            isResolved: false,
            path: 'src/bar.ts',
            line: 25,
            comments: {
              nodes: [
                {
                  author: { login: 'alice' },
                  body: 'needs refactor',
                  url: 'https://github.com/test/repo/pull/1#discussion_r2',
                },
              ],
            },
          }),
        ]),
      )
    const getPrFeedback = createGetPrFeedback(runGh)
    const result = getPrFeedback(1)
    expect(result.threads[0]).toMatchObject({
      id: 't1',
      path: 'src/bar.ts',
      line: 25,
    })
    expect(result.threads[0]?.comments).toStrictEqual([
      {
        author: { login: 'alice' },
        body: 'needs refactor',
        url: 'https://github.com/test/repo/pull/1#discussion_r2',
      },
    ])
  })
})
