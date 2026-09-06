import { vi } from 'vitest'
import type { GithubRequiredChecks } from '../../../../infra/external-clients/github/get-required-checks'
import { createWorkflowRequiredChecksReader } from './workflow-required-checks-reader'

type Run = Extract<GithubRequiredChecks['checks'][number], { __typename: 'CheckRun' }>
type Status = Extract<GithubRequiredChecks['checks'][number], { __typename: 'StatusContext' }>
const request = {
  repository: 'example/repo',
  prNumber: 1,
  headRevision: 'a'.repeat(40),
  baseBranch: 'main',
}
const run: Run = {
  __typename: 'CheckRun',
  name: 'build',
  status: 'COMPLETED',
  conclusion: 'SUCCESS',
  detailsUrl: null,
  isRequired: true,
  checkSuite: { app: null, commit: { oid: request.headRevision } },
}
function translate(check: GithubRequiredChecks['checks'][number]) {
  const read = vi.fn(() => ({
    headRevision: request.headRevision,
    requirements: [],
    checks: [check],
  }))
  return { read, result: createWorkflowRequiredChecksReader(read)(request) }
}

it.each([
  ['SUCCESS', 'passed'],
  ['NEUTRAL', 'passed'],
  ['SKIPPED', 'passed'],
  ['FAILURE', 'failed'],
  ['CANCELLED', 'failed'],
  ['ACTION_REQUIRED', 'failed'],
  ['STALE', 'failed'],
  ['STARTUP_FAILURE', 'failed'],
  ['TIMED_OUT', 'failed'],
  [null, 'indeterminate'],
] satisfies readonly (readonly [Run['conclusion'], string])[])(
  'translates completed %s runs to %s',
  (conclusion, status) => {
    const { read, result } = translate({ ...run, conclusion })
    expect(read).toHaveBeenCalledWith(request)
    expect(result).toStrictEqual({
      headRevision: request.headRevision,
      checks: [{ name: 'build', status, detailsUrl: null }],
    })
  },
)

it.each(['IN_PROGRESS', 'PENDING', 'QUEUED', 'REQUESTED', 'WAITING'] satisfies Run['status'][])(
  'waits for %s runs',
  (status) => {
    expect(translate({ ...run, status, conclusion: null }).result.checks).toStrictEqual([
      { name: 'build', status: 'pending', detailsUrl: null },
    ])
  },
)

it('rejects contradictory in-progress completion evidence', () => {
  expect(translate({ ...run, status: 'IN_PROGRESS' }).result.checks).toStrictEqual([
    { name: 'build', status: 'indeterminate', detailsUrl: null },
  ])
})

it.each([
  ['ERROR', 'failed'],
  ['EXPECTED', 'pending'],
  ['FAILURE', 'failed'],
  ['PENDING', 'pending'],
  ['SUCCESS', 'passed'],
] satisfies readonly (readonly [Status['state'], string])[])(
  'translates %s statuses to %s',
  (state, status) => {
    expect(
      translate({
        __typename: 'StatusContext',
        context: 'external-check',
        state,
        targetUrl: null,
        isRequired: true,
      }).result.checks,
    ).toStrictEqual([{ name: 'external-check', status, detailsUrl: null }])
  },
)
