import { z } from 'zod'

const SUMMARY_SCHEMA = z.string().trim().min(1)
const REASON_SCHEMA = z.string().trim().min(1)

/** @riviere-role value-object */
export class ImplementationOutcome {
  declare private readonly brand: 'ImplementationOutcome'

  private constructor(
    private readonly outcomeSummary: string,
    private readonly blockedReason: string | null,
  ) {}

  static from(input: {
    readonly summary: string
    readonly blockedReason: string | null
  }): ImplementationOutcome {
    return new ImplementationOutcome(
      SUMMARY_SCHEMA.parse(input.summary),
      input.blockedReason === null ? null : REASON_SCHEMA.parse(input.blockedReason),
    )
  }

  summary(): string {
    return this.outcomeSummary
  }

  isBlocked(): boolean {
    return this.blockedReason !== null
  }

  reason(): string | null {
    return this.blockedReason
  }
}
