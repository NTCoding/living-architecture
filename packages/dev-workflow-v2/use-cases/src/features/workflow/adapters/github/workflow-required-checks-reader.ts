import type { ReadRequiredPullRequestChecks } from '@living-architecture/dev-workflow-v2-domain-model/domain/ports/read-required-pull-request-checks'
import type {
  GithubRequiredChecks,
  GithubRequiredChecksRequest,
} from '../../../../infra/external-clients/github/get-required-checks'

type Observation = GithubRequiredChecks['checks'][number]
type Run = Extract<Observation, { __typename: 'CheckRun' }>
type Status = Extract<Observation, { __typename: 'StatusContext' }>
type Check = ReturnType<ReadRequiredPullRequestChecks>['checks'][number]
const conclusions = {
  SUCCESS: 'passed',
  NEUTRAL: 'passed',
  SKIPPED: 'passed',
  ACTION_REQUIRED: 'failed',
  CANCELLED: 'failed',
  FAILURE: 'failed',
  STALE: 'failed',
  STARTUP_FAILURE: 'failed',
  TIMED_OUT: 'failed',
} satisfies Record<NonNullable<Run['conclusion']>, Check['status']>
const statuses = {
  ERROR: 'failed',
  EXPECTED: 'pending',
  FAILURE: 'failed',
  PENDING: 'pending',
  SUCCESS: 'passed',
} satisfies Record<Status['state'], Check['status']>
const completion = {
  COMPLETED: true,
  IN_PROGRESS: false,
  PENDING: false,
  QUEUED: false,
  REQUESTED: false,
  WAITING: false,
} satisfies Record<Run['status'], boolean>

function translateRun(run: Run): Check {
  if (!completion[run.status])
    return {
      name: run.name,
      status: run.conclusion === null ? 'pending' : 'indeterminate',
      detailsUrl: run.detailsUrl,
    }
  return {
    name: run.name,
    status: run.conclusion === null ? 'indeterminate' : conclusions[run.conclusion],
    detailsUrl: run.detailsUrl,
  }
}

function translateStatus(status: Status): Check {
  return { name: status.context, status: statuses[status.state], detailsUrl: status.targetUrl }
}

function translateCheck(check: Observation): Check {
  if (check.__typename === 'CheckRun') return translateRun(check)
  return translateStatus(check)
}

/** @riviere-role domain-port-adapter */
export function createWorkflowRequiredChecksReader(
  readChecks: (request: GithubRequiredChecksRequest) => GithubRequiredChecks,
): ReadRequiredPullRequestChecks {
  return (request) => {
    const response = readChecks(request)
    return { headRevision: response.headRevision, checks: response.checks.map(translateCheck) }
  }
}
