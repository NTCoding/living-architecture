import { describe, expect, it } from 'vitest'
import { CommitRecord } from './commit-record'

describe('CommitRecord', () => {
  it('keeps the commit sha and message', () => {
    const commit = CommitRecord.parse({
      sha: '4d83240f6',
      message: 'feat: add the review cycle',
    })

    expect(commit.sha()).toBe('4d83240f6')
    expect(commit.message()).toBe('feat: add the review cycle')
  })

  it('rejects a sha that is not hex', () => {
    expect(() => CommitRecord.parse({ sha: 'NOT-A-SHA', message: 'feat: add it' })).toThrow(
      'A commit sha is 7 to 40 lower case hex characters.',
    )
  })

  it('rejects an empty message', () => {
    expect(() => CommitRecord.parse({ sha: '4d83240f6', message: ' ' })).toThrow(
      'String must contain at least 1 character(s)',
    )
  })
})
