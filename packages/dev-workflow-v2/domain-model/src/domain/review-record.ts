import { z } from 'zod'
import {
  reviewCompletionProvenanceSchema,
  reviewFindingSchema,
  type ReviewCompletionProvenance,
  type ReviewFinding,
  type StoredEvent,
} from '@nt-ai-lab/deterministic-agent-workflow-engine'

const reviewRecordedEventType = 'review-completed'

type ReviewRecordData = {
  readonly reviewId: number
  readonly createdAt: string
  readonly reviewType: string
  readonly verdict: 'PASS' | 'FAIL'
  readonly findings: readonly ReviewFinding[]
  readonly summary?: string | undefined
  readonly branch?: string | undefined
  readonly pullRequestNumber?: number | undefined
  readonly completionProvenance: ReviewCompletionProvenance
}

const reviewRecordSchema: z.ZodType<ReviewRecordData, z.ZodTypeDef, unknown> = z
  .object({
    reviewId: z.number().int().positive(),
    createdAt: z.string().min(1),
    reviewType: z.string().min(1),
    verdict: z.enum(['PASS', 'FAIL']),
    findings: z.array(reviewFindingSchema),
    summary: z.string().min(1).optional(),
    branch: z.string().min(1).optional(),
    pullRequestNumber: z.number().int().positive().optional(),
    completionProvenance: reviewCompletionProvenanceSchema,
  })
  .strict()

/** @riviere-role value-object */
export class ReviewRecord {
  declare private readonly brand: 'ReviewRecord'

  readonly reviewId: number
  readonly createdAt: string
  readonly reviewType: string
  readonly verdict: 'PASS' | 'FAIL'
  readonly findings: readonly ReviewFinding[]
  readonly summary: string | undefined
  readonly branch: string | undefined
  readonly pullRequestNumber: number | undefined
  readonly completionProvenance: ReviewCompletionProvenance

  private constructor(value: ReviewRecordData) {
    this.reviewId = value.reviewId
    this.createdAt = value.createdAt
    this.reviewType = value.reviewType
    this.verdict = value.verdict
    this.findings = value.findings
    this.summary = value.summary
    this.branch = value.branch
    this.pullRequestNumber = value.pullRequestNumber
    this.completionProvenance = value.completionProvenance
  }

  static parse(value: unknown): ReviewRecord {
    return new ReviewRecord(reviewRecordSchema.parse(value))
  }
}

/**
 * @riviere-role domain-service
 * @riviere-role-justification Review events are consumer-owned event-sourced data with no owning aggregate; synthesising the stored-event envelope from a review record is a stateless mapping that cannot live on the value object without coupling it to the storage envelope.
 */
export function buildReviewRecordedEvent(record: ReviewRecord, state: string): StoredEvent {
  return {
    envelope: {
      type: reviewRecordedEventType,
      at: record.createdAt,
      state,
    },
    payload: reviewRecordSchema.parse(record),
  }
}

/**
 * @riviere-role domain-service
 * @riviere-role-justification Reviews are consumer-owned event-sourced data with no owning aggregate; parsing stored events back into review records is a stateless mapping that cannot live on the value object without coupling it to the storage envelope.
 */
export function readReviewRecords(events: readonly StoredEvent[]): readonly ReviewRecord[] {
  return events
    .map((event, index) => {
      if (event.envelope.type !== reviewRecordedEventType) return undefined
      const parsed = reviewRecordSchema.safeParse(stripEnvelopeCreatedAt(event))
      if (!parsed.success) {
        throw new MalformedReviewRecordError(
          `Malformed "${reviewRecordedEventType}" event at position ${String(index)}: ${parsed.error.message}`,
        )
      }
      return ReviewRecord.parse(parsed.data)
    })
    .filter((record) => record !== undefined)
}

function stripEnvelopeCreatedAt(event: StoredEvent): Record<string, unknown> {
  return {
    ...event.payload,
    createdAt: event.envelope.at,
  }
}

/** @riviere-role domain-error */
export class MalformedReviewRecordError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MalformedReviewRecordError'
  }
}
