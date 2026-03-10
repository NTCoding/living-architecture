import {
  describe, it, expect, vi 
} from 'vitest'
import { createGetPrFeedback } from './get-pr-feedback'

function ghResponse(threads: readonly object[]): string {
  return JSON.stringify({ reviewThreads: threads })
}

function makeThread(
  overrides: Partial<{
    id: string
    isResolved: boolean
    isOutdated: boolean
    path: string | null
    line: number | null
    comments: readonly {
      author: { login: string } | null
      body: string
    }[]
  }> = {},
): object {
  return {
    id: 'thread-1',
    isResolved: false,
    isOutdated: false,
    path: 'src/foo.ts',
    line: 10,
    comments: [
      {
        author: { login: 'reviewer' },
        body: 'fix this',
      },
    ],
    ...overrides,
  }
}

describe('createGetPrFeedback', () => {
  it('calls gh with correct args', () => {
    const runGh = vi.fn().mockReturnValue(ghResponse([]))
    const getPrFeedback = createGetPrFeedback(runGh)
    getPrFeedback(42)
    expect(runGh).toHaveBeenCalledWith('pr view 42 --json reviewThreads')
  })

  it('returns zero unresolved when all threads are resolved', () => {
    const runGh = vi.fn().mockReturnValue(
      ghResponse([
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
    const runGh = vi.fn().mockReturnValue(
      ghResponse([
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
    const runGh = vi.fn().mockReturnValue(ghResponse([]))
    const getPrFeedback = createGetPrFeedback(runGh)
    const result = getPrFeedback(1)
    expect(result.unresolvedCount).toBe(0)
    expect(result.threads).toHaveLength(0)
  })

  it('throws when gh output is invalid JSON', () => {
    const runGh = vi.fn().mockReturnValue('not json')
    const getPrFeedback = createGetPrFeedback(runGh)
    expect(() => getPrFeedback(1)).toThrow('Unexpected token')
  })

  it('throws when gh output has unexpected shape', () => {
    const runGh = vi.fn().mockReturnValue(JSON.stringify({ wrong: 'shape' }))
    const getPrFeedback = createGetPrFeedback(runGh)
    expect(() => getPrFeedback(1)).toThrow('Required')
  })

  it('preserves thread details in returned threads', () => {
    const runGh = vi.fn().mockReturnValue(
      ghResponse([
        makeThread({
          id: 't1',
          isResolved: false,
          path: 'src/bar.ts',
          line: 25,
          comments: [
            {
              author: { login: 'alice' },
              body: 'needs refactor',
            },
          ],
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
  })
})
