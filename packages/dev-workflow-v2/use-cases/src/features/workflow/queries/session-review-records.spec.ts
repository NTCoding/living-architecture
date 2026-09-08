import { describe, expect, it } from 'vitest'
import {
  createSessionReviewRecordedEvent,
  listSessionReviewRecords,
} from './session-review-records'

const plainRecord = {
  reviewId: 1,
  createdAt: '2026-01-01T00:00:00Z',
  reviewType: 'code-review',
  verdict: 'PASS' as const,
  findings: [],
  branch: 'feat/test',
  pullRequestNumber: 123,
  completionProvenance: {
    bundleId: 'review-example/repo-123',
    providerSessionId: 'provider-session',
    providerRunId: 'provider-run-1',
    baseRevision: 'a'.repeat(40),
    headRevision: 'b'.repeat(40),
    exactFilesDigest: 'c'.repeat(64),
    exactFiles: ['src/test.ts'],
    reviewerDefinitionVersion: '1',
  },
}

describe('createSessionReviewRecordedEvent', () => {
  it('stamps the consumer-owned review event envelope', () => {
    const event = createSessionReviewRecordedEvent(plainRecord, 'REVIEWING')
    expect(event.envelope).toStrictEqual({
      type: 'review-completed',
      at: plainRecord.createdAt,
      state: 'REVIEWING',
    })
    expect(event.payload).toStrictEqual({
      ...plainRecord,
      summary: undefined,
    })
  })

  it('rejects a payload that is not a valid review record', () => {
    expect(() => createSessionReviewRecordedEvent({ verdict: 'MAYBE' }, 'REVIEWING')).toThrow(
      'verdict',
    )
  })
})

describe('listSessionReviewRecords', () => {
  it('reads consumer-owned review events back into review records', () => {
    const event = createSessionReviewRecordedEvent(plainRecord, 'REVIEWING')
    const records = listSessionReviewRecords([event])
    expect(records).toHaveLength(1)
    expect(records[0]?.reviewType).toBe('code-review')
    expect(records[0]?.verdict).toBe('PASS')
    expect(records[0]?.completionProvenance.headRevision).toBe('b'.repeat(40))
  })

  it('ignores events that are not consumer review events', () => {
    const event = createSessionReviewRecordedEvent(plainRecord, 'REVIEWING')
    expect(
      listSessionReviewRecords([
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
    ).toHaveLength(1)
  })

  it('throws when a consumer review event does not satisfy the review record schema', () => {
    const event = createSessionReviewRecordedEvent(plainRecord, 'REVIEWING')
    expect(() =>
      listSessionReviewRecords([
        {
          envelope: event.envelope,
          payload: {
            ...event.payload,
            verdict: 'MAYBE',
          },
        },
      ]),
    ).toThrow('Malformed "review-completed" event at position 0')
  })
})
