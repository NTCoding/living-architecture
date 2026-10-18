import {
  ReviewCycle,
  ReviewerStatuses,
  ReviewVerdict,
} from '@living-architecture/dev-workflow-v3-domain-model'

/** @riviere-role command-use-case-result-value */
export interface ReviewVerdictResult {
  readonly reviewer: string
  readonly status: string
  readonly findings: readonly {
    readonly file: string
    readonly line: number
    readonly rule: string | null
    readonly summary: string
  }[]
}

/** @riviere-role command-use-case-input */
export interface CloseReviewCycleInput {
  readonly cycleNumber: number
  readonly statuses: Readonly<Record<string, string>>
  readonly verdicts: readonly ReviewVerdictResult[]
}

/** @riviere-role command-use-case-result */
export interface CloseReviewCycleResult {
  readonly cycleNumber: number
  readonly reviewersToRun: readonly string[]
  readonly reviewersLeftOut: readonly string[]
  readonly limitReached: boolean
}

/** @riviere-role command-use-case */
export class CloseReviewCycle {
  execute(input: CloseReviewCycleInput): CloseReviewCycleResult {
    const cycle = input.verdicts
      .map((verdict) => ReviewVerdict.parse(verdict))
      .reduce(
        (current, verdict) => current.recordVerdict(verdict),
        ReviewCycle.start({
          cycleNumber: input.cycleNumber,
          statuses: ReviewerStatuses.parse(input.statuses),
        }),
      )
    const plan = cycle.reviewersToRun()
    return {
      cycleNumber: cycle.cycleNumber(),
      reviewersToRun: plan.included().map((reviewer) => reviewer.name()),
      reviewersLeftOut: plan.excluded().map((reviewer) => reviewer.name()),
      limitReached: cycle.isLimitReached(),
    }
  }
}
