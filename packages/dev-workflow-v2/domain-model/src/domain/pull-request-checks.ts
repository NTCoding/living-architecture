import { z } from 'zod'

const checkSchema = z
  .object({
    name: z.string().min(1),
    status: z.enum(['passed', 'pending', 'failed', 'indeterminate']),
    detailsUrl: z.string().url().nullable(),
  })
  .readonly()
const checksSchema = z.object({
  headRevision: z.string().regex(/^[0-9a-f]{40}$/),
  checks: z.array(checkSchema).min(1).readonly(),
})
type CheckDecision =
  | { readonly status: 'blocked'; readonly reason: string }
  | {
      readonly status: 'passed' | 'pending' | 'failed'
      readonly checks: readonly z.infer<typeof checkSchema>[]
    }
const checkDecisions = {
  passed: 'passed',
  pending: 'pending',
  failed: 'failed',
  indeterminate: 'blocked',
} satisfies Record<z.infer<typeof checkSchema>['status'], CheckDecision['status']>

/** @riviere-role value-object */
export class PullRequestChecks {
  declare private readonly brand: 'PullRequestChecks'
  readonly headRevision: string
  readonly checks: readonly z.infer<typeof checkSchema>[]

  private constructor(value: z.infer<typeof checksSchema>) {
    this.headRevision = value.headRevision
    this.checks = value.checks
  }

  static parse(value: unknown): PullRequestChecks {
    return new PullRequestChecks(checksSchema.parse(value))
  }

  assessFor(headRevision: string): CheckDecision {
    if (headRevision !== this.headRevision)
      return { status: 'blocked', reason: 'Required checks do not belong to the current PR head.' }
    const decisions = this.checks.map((check) => checkDecisions[check.status])
    if (decisions.includes('blocked'))
      return {
        status: 'blocked',
        reason: `Required check results are indeterminate: ${JSON.stringify(this.checks)}`,
      }
    if (decisions.includes('failed')) return { status: 'failed', checks: this.checks }
    if (decisions.includes('pending')) return { status: 'pending', checks: this.checks }
    return { status: 'passed', checks: this.checks }
  }
}
