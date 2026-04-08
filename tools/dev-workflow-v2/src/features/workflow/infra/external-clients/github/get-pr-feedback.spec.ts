import {
  describe, it, expect, vi 
} from 'vitest'
import { createGetPrFeedback } from './get-pr-feedback'

const REPO_INFO = JSON.stringify({
  owner: { login: 'TestOwner' },
  name: 'test-repo',
})

function graphqlResponse(threads: readonly object[]): string {
  return JSON.stringify({data: { repository: { pullRequest: { reviewThreads: { nodes: threads } } } },})
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
        },
      ],
    },
    ...overrides,
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
    expect(graphqlCall).toContain('owner: "TestOwner"')
    expect(graphqlCall).toContain('name: "test-repo"')
  })

  it('returns zero unresolved when all threads are resolved', () => {
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
            isResolved: true,
          }),
        ]),
      )
    const getPrFeedback = createGetPrFeedback(runGh)
    const result = getPrFeedback(1)
    expect(result.unresolvedCount).toBe(0)
    expect(result.threads).toHaveLength(0)
  })

  it('filters to only unresolved threads', () => {
    const runGh = vi
      .fn()
      .mockReturnValueOnce(REPO_INFO)
      .mockReturnValueOnce(
        graphqlResponse([
          makeThread({
            id: 't1',
            isResolved: false,
          }),
          makeThread({
            id: 't2',
            isResolved: true,
          }),
          makeThread({
            id: 't3',
            isResolved: false,
          }),
        ]),
      )
    const getPrFeedback = createGetPrFeedback(runGh)
    const result = getPrFeedback(1)
    expect(result.unresolvedCount).toBe(2)
    expect(result.threads).toHaveLength(2)
    expect(result.threads.map((t) => t.id)).toStrictEqual(['t1', 't3'])
  })

  it('returns empty when no review threads exist', () => {
    const runGh = vi.fn().mockReturnValueOnce(REPO_INFO).mockReturnValueOnce(graphqlResponse([]))
    const getPrFeedback = createGetPrFeedback(runGh)
    const result = getPrFeedback(1)
    expect(result.unresolvedCount).toBe(0)
    expect(result.threads).toHaveLength(0)
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
      },
    ])
  })
})
