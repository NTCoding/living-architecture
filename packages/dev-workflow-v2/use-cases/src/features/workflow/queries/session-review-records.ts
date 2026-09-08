import type { StoredEvent } from '@nt-ai-lab/deterministic-agent-workflow-engine'
import {
  ReviewRecord,
  buildReviewRecordedEvent,
  readReviewRecords,
} from '@living-architecture/dev-workflow-v2-domain-model/domain/review-record'

/** @riviere-role query-model-value */
export type SessionReviewRecord = ReviewRecord

/** @riviere-role query-model */
export function listSessionReviewRecords(
  events: readonly StoredEvent[],
): readonly SessionReviewRecord[] {
  return readReviewRecords(events)
}

/** @riviere-role query-model */
export function createSessionReviewRecordedEvent(
  record: Record<string, unknown>,
  state: string,
): StoredEvent {
  return buildReviewRecordedEvent(ReviewRecord.parse(record), state)
}
