import {
  describe, it, expect 
} from 'vitest'
import {
  classifyThread, formatThreadForOutput, type RawThreadData 
} from './review-thread'
import { Reviewer } from './reviewer'

describe('classifyThread', () => {
  const createRawThread = (overrides: Partial<RawThreadData> = {}): RawThreadData => ({
    id: 'thread-123',
    isResolved: false,
    isOutdated: false,
    path: 'src/file.ts',
    line: 42,
    comments: {
      nodes: [
        {
          author: { login: 'octocat' },
          body: 'Review comment',
        },
      ],
    },
    ...overrides,
  })

  it('returns null when thread has no comments', () => {
    const raw = createRawThread({ comments: { nodes: [] } })
    expect(classifyThread(raw)).toBeNull()
  })

  it('classifies active thread', () => {
    const raw = createRawThread()
    const result = classifyThread(raw)
    expect(result).toMatchObject({
      type: 'active',
      threadId: 'thread-123',
      body: 'Review comment',
    })
  })

  it('classifies resolved thread', () => {
    const raw = createRawThread({ isResolved: true })
    const result = classifyThread(raw)
    expect(result).toMatchObject({
      type: 'resolved',
      threadId: 'thread-123',
    })
  })

  it('classifies outdated thread', () => {
    const raw = createRawThread({ isOutdated: true })
    const result = classifyThread(raw)
    expect(result).toMatchObject({
      type: 'outdated',
      threadId: 'thread-123',
    })
  })

  it('creates line-level location when path and line provided', () => {
    const raw = createRawThread({
      path: 'src/file.ts',
      line: 42,
    })
    const result = classifyThread(raw)
    expect(result?.location).toStrictEqual({
      type: 'line-level',
      file: 'src/file.ts',
      line: 42,
    })
  })

  it('creates file-level location when path provided without line', () => {
    const raw = createRawThread({
      path: 'src/file.ts',
      line: null,
    })
    const result = classifyThread(raw)
    expect(result?.location).toStrictEqual({
      type: 'file-level',
      file: 'src/file.ts',
    })
  })

  it('creates pr-level location when path is null', () => {
    const raw = createRawThread({
      path: null,
      line: null,
    })
    const result = classifyThread(raw)
    expect(result?.location).toStrictEqual({ type: 'pr-level' })
  })

  it('handles author with null login', () => {
    const raw = createRawThread({
      comments: {
        nodes: [
          {
            author: null,
            body: 'Comment',
          },
        ],
      },
    })
    const result = classifyThread(raw)
    expect(result?.author.value).toBe('[deleted]')
  })
})

describe('formatThreadForOutput', () => {
  it('formats active thread for output', () => {
    const thread = {
      type: 'active' as const,
      threadId: 'thread-123',
      location: {
        type: 'line-level' as const,
        file: 'src/file.ts',
        line: 42,
      },
      author: Reviewer.createFromGitHubLogin('octocat'),
      body: 'Review comment',
    }
    const result = formatThreadForOutput(thread)
    expect(result).toStrictEqual({
      threadId: 'thread-123',
      location: 'src/file.ts:42',
      author: 'octocat',
      body: 'Review comment',
    })
  })

  it('formats pr-level location', () => {
    const thread = {
      type: 'active' as const,
      threadId: 'thread-123',
      location: { type: 'pr-level' as const },
      author: Reviewer.createFromGitHubLogin('octocat'),
      body: 'Comment',
    }
    const result = formatThreadForOutput(thread)
    expect(result.location).toBe('PR-level')
  })
})
