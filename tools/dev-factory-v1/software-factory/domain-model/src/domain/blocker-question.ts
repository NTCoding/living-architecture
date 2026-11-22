import { z } from 'zod'

const QUESTION_SCHEMA = z.string().trim().min(1)
const EVIDENCE_SCHEMA = z.string().nullable()

/** @riviere-role value-object */
export class BlockerQuestion {
  declare private readonly brand: 'BlockerQuestion'

  private constructor(
    private readonly blockerQuestion: string,
    private readonly blockerEvidence: string | null,
  ) {}

  static parse(input: {
    readonly question: string
    readonly evidence: string | null
  }): BlockerQuestion {
    return new BlockerQuestion(
      QUESTION_SCHEMA.parse(input.question),
      EVIDENCE_SCHEMA.parse(input.evidence),
    )
  }

  question(): string {
    return this.blockerQuestion
  }

  evidence(): string | null {
    return this.blockerEvidence
  }
}
