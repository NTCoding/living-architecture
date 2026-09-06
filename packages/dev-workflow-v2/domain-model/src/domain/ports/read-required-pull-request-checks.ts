import type { PullRequestChecks } from '../pull-request-checks'

/**
 * @riviere-role domain-port
 * @riviere-role-justification Reads current required-check policy and results from the PR host for an exact revision. These are external facts that can change independently of MaintainerWorkflow, not previously created aggregate state to restore through its repository.
 */
export type ReadRequiredPullRequestChecks = (request: {
  readonly repository: string
  readonly prNumber: number
  readonly headRevision: string
  readonly baseBranch: string
}) => Pick<PullRequestChecks, 'headRevision' | 'checks'>
