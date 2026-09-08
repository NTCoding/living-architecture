import { describe, expect, it } from 'vitest'
import {
  MalformedReviewRecordError,
  ReviewRecord,
  buildReviewRecordedEvent,
  readReviewRecords,
} from './review-record'

const plainRecord = {
  reviewId: 1,
  createdAt: '2026-01-01T00:00:00Z',
  reviewType: 'code-review',
  verdict: 'PASS' as const,
  findings: [],
  summary: 'All good.',
  branch: 'feat/test',
  pullRequestNumber: 123,
  completionProvenance: {
    bundleId: 'review-example/repo-123',
    providerSessionId: 'provider-session',
    providerRunId: 'provider-run-1',
    baseRevision: 'a'.repeat(40),
    headRevision: 'b'.repeat(40),
    exactFilesDigest: 'd'.repeat(64),
    exactFiles: ['src/test.ts'],
    reviewerDefinitionVersion: '1',
  },
}

describe('ReviewRecord', () => {
  it('parses a valid review record', () => {
    const record = ReviewRecord.parse(plainRecord)
    expect(record.reviewType).toBe('code-review')
    expect(record.verdict).toBe('PASS')
    expect(record.completionProvenance.providerSessionId).toBe('provider-session')
  })

  it('rejects an invalid review record', () => {
    expect(() =>
      ReviewRecord.parse({
        ...plainRecord,
        verdict: 'MAYBE',
      }),
    ).toThrow('verdict')
  })
})

describe('buildReviewRecordedEvent', () => {
  it('stamps the consumer-owned event envelope from the record', () => {
    const event = buildReviewRecordedEvent(ReviewRecord.parse(plainRecord), 'REVIEWING')
    expect(event.envelope).toStrictEqual({
      type: 'review-completed',
      at: plainRecord.createdAt,
      state: 'REVIEWING',
    })
    expect(event.payload).toStrictEqual(plainRecord)
  })
})

describe('readReviewRecords', () => {
  it('reads recorded review events back into review records', () => {
    const event = buildReviewRecordedEvent(ReviewRecord.parse(plainRecord), 'REVIEWING')
    expect(readReviewRecords([event])).toStrictEqual([ReviewRecord.parse(plainRecord)])
  })

  it('ignores events with other types', () => {
    const event = buildReviewRecordedEvent(ReviewRecord.parse(plainRecord), 'REVIEWING')
    expect(
      readReviewRecords([
        {
          envelope: {
            type: 'transitioned',
            at: plainRecord.createdAt,
            state: 'REVIEWING',
          },
          payload: {},
        },
        event,
      ]),
    ).toStrictEqual([ReviewRecord.parse(plainRecord)])
  })

  it('throws the exact malformed payload when a review event does not satisfy the schema', () => {
    const event = buildReviewRecordedEvent(ReviewRecord.parse(plainRecord), 'REVIEWING')
    const malformed = {
      envelope: event.envelope,
      payload: {
        ...event.payload,
        verdict: 'MAYBE',
      },
    }
    expect(() => readReviewRecords([malformed])).toThrow(MalformedReviewRecordError)
    expect(() => readReviewRecords([malformed])).toThrow(
      'Malformed "review-completed" event at position 0',
    )
  })
})
