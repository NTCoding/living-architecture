import {
  ReviewCycle,
  type ReviewerStatuses,
  type ReviewVerdict,
} from '@living-architecture/dev-workflow-v3-domain-model'

/** @riviere-role command-use-case-input */
export interface CloseReviewCycleInput {
  readonly cycleNumber: number
  readonly statuses: ReviewerStatuses
  readonly verdicts: readonly ReviewVerdict[]
}

/** @riviere-role command-use-case-result */
export interface CloseReviewCycleResult {
  readonly cycleNumber: number
  readonly reviewersToRun: readonly string[]
  readonly reviewersLeftOut: readonly string[]
  readonly limitReached: boolean
}

/**
 * Records the verdicts on the cycle, then says who still needs to review and
 * whether the limit is reached. It changes no external state.
 * @riviere-role command-use-case
 */
export class CloseReviewCycle {
  execute(input: CloseReviewCycleInput): CloseReviewCycleResult {
    const cycle = input.verdicts.reduce(
      (current, verdict) => current.recordVerdict(verdict),
      ReviewCycle.start({ cycleNumber: input.cycleNumber, statuses: input.statuses }),
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
