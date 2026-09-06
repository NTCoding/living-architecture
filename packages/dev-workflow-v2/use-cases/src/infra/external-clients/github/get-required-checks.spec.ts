import { readFileSync } from 'node:fs'
import { vi } from 'vitest'
import { readGithubRequiredChecks, GithubRequiredChecksError } from './get-required-checks'

const request = {
  repository: 'example/repo',
  prNumber: 42,
  headRevision: 'a'.repeat(40),
  baseBranch: 'main',
}
const check = {
  __typename: 'CheckRun',
  name: 'build',
  isRequired: true,
  status: 'COMPLETED',
  conclusion: 'SUCCESS',
  detailsUrl: null,
  checkSuite: { app: { databaseId: 1 }, commit: { oid: request.headRevision } },
}
const rules = [
  {
    type: 'required_status_checks',
    parameters: { required_status_checks: [{ context: 'build', integration_id: 1 }] },
  },
]
const protection = {
  requiresStatusChecks: true,
  requiredStatusChecks: [{ context: 'build', app: { databaseId: 1 } }],
}
function page(
  overrides: Partial<{
    checks: readonly object[]
    head: string
    commit: string
    branch: string
    protection: object | null
    next: boolean
    cursor: string | null
  }> = {},
) {
  return {
    data: {
      repository: {
        ref: { branchProtectionRule: overrides.protection ?? null },
        pullRequest: {
          headRefOid: overrides.head ?? request.headRevision,
          baseRefName: overrides.branch ?? 'main',
          commits: {
            nodes: [
              {
                commit: {
                  oid: overrides.commit ?? request.headRevision,
                  statusCheckRollup: {
                    contexts: {
                      nodes: overrides.checks ?? [check],
                      pageInfo: {
                        hasNextPage: overrides.next ?? false,
                        endCursor: overrides.cursor ?? null,
                      },
                    },
                  },
                },
              },
            ],
          },
        },
      },
    },
  }
}
function runner(...responses: readonly unknown[]) {
  const execute = vi.fn<(args: readonly string[]) => string>()
  for (const response of responses) execute.mockReturnValueOnce(JSON.stringify(response))
  return execute
}

it('reads the demonstrated required checks for the exact live PR revision', () => {
  const fixture = (name: string): unknown =>
    JSON.parse(
      readFileSync(new URL(`./__fixtures__/required-checks-${name}.json`, import.meta.url), 'utf8'),
    )
  const execute = runner(fixture('rules'), fixture('rollup'), fixture('rules'), fixture('rollup'))
  const result = readGithubRequiredChecks(execute, {
    repository: 'NTCoding/living-architecture',
    prNumber: 528,
    headRevision: '693704806dd233247def5af3e220e9fea8580b4f',
    baseBranch: 'main',
  })
  expect(result.requirements.map((required) => required.context)).toStrictEqual([
    'main',
    'knip',
    'CodeRabbit',
    'validate',
    'SonarCloud Code Analysis',
  ])
  expect(
    result.checks.map((value) => (value.__typename === 'CheckRun' ? value.name : value.context)),
  ).toStrictEqual(['main', 'validate', 'knip', 'CodeRabbit', 'SonarCloud Code Analysis'])
})

it('combines classic protection with rulesets without duplicate requirements', () => {
  const execute = runner(rules, page({ protection }), rules, page({ protection }))
  expect(readGithubRequiredChecks(execute, request).requirements).toStrictEqual(
    protection.requiredStatusChecks,
  )
})

it('reads subsequent pages before accepting the required-check set', () => {
  const execute = runner(
    rules,
    page({ checks: [], next: true, cursor: 'next' }),
    page(),
    rules,
    page(),
  )
  expect(readGithubRequiredChecks(execute, request).checks).toStrictEqual([check])
  expect(execute.mock.calls[2]?.[0].at(-1)).toContain('after: "next"')
})

it.each([{ head: 'b'.repeat(40) }, { commit: 'b'.repeat(40) }, { branch: 'release' }])(
  'rejects a changed PR revision or target: %j',
  (overrides) => {
    expect(() => readGithubRequiredChecks(runner(rules, page(overrides)), request)).toThrow(
      'PR revisions changed',
    )
  },
)

it.each([
  { next: true, cursor: null },
  { next: true, cursor: 'same' },
])('rejects missing or repeated pagination cursors: %j', (pagination) => {
  expect(() =>
    readGithubRequiredChecks(runner(rules, page(pagination), page(pagination)), request),
  ).toThrow('Invalid required-check pagination cursor')
})

it('rejects protection that changes between pages', () => {
  expect(() =>
    readGithubRequiredChecks(
      runner(rules, page({ next: true, cursor: 'next' }), page({ protection })),
      request,
    ),
  ).toThrow('Branch protection changed')
})

it('rejects rules that change while checks are being read', () => {
  expect(() => readGithubRequiredChecks(runner(rules, page(), []), request)).toThrow(
    'Required check rules changed',
  )
})

it.each([
  [[], page()],
  [rules, page({ checks: [] })],
])('rejects absent requirements or zero observed checks', (requirements, response) => {
  expect(() =>
    readGithubRequiredChecks(runner(requirements, response, requirements), request),
  ).toThrow('No required checks were established')
})

it('rejects a required classic check policy without named checks', () => {
  expect(() =>
    readGithubRequiredChecks(
      runner([], page({ protection: { requiresStatusChecks: true, requiredStatusChecks: [] } })),
      request,
    ),
  ).toThrow('Required branch checks are indeterminate')
})

it.each([
  { ...check, isRequired: false },
  { ...check, name: 'other' },
  { ...check, checkSuite: { ...check.checkSuite, app: null } },
  { ...check, checkSuite: { ...check.checkSuite, app: { databaseId: 2 } } },
  {
    __typename: 'StatusContext',
    context: 'other',
    state: 'SUCCESS',
    targetUrl: null,
    isRequired: true,
  },
])('rejects a missing required result instead of accepting another check: %j', (observed) => {
  expect(() =>
    readGithubRequiredChecks(runner(rules, page({ checks: [observed] }), rules), request),
  ).toThrow('Required check is absent: build')
})

it('rejects a check suite from a different commit', () => {
  const observed = {
    ...check,
    checkSuite: { ...check.checkSuite, commit: { oid: 'b'.repeat(40) } },
  }
  expect(() =>
    readGithubRequiredChecks(runner(rules, page({ checks: [observed] }), rules), request),
  ).toThrow('Check run belongs to another commit')
})

it('supports a requirement without a specific app publisher', () => {
  const requirements = [
    {
      type: 'required_status_checks',
      parameters: { required_status_checks: [{ context: 'build', integration_id: null }] },
    },
    { type: 'deletion' },
  ]
  expect(
    readGithubRequiredChecks(runner(requirements, page(), requirements, page()), request)
      .requirements,
  ).toStrictEqual([{ context: 'build', app: null }])
})

it('ignores disabled classic status-check policy', () => {
  const response = page({ protection: { requiresStatusChecks: false, requiredStatusChecks: [] } })
  expect(
    readGithubRequiredChecks(runner(rules, response, rules, response), request).checks,
  ).toStrictEqual([check])
})

it.each([{}, { errors: [{ message: 'Permission denied' }], ...page() }])(
  'rejects malformed or partially failed GitHub responses',
  (response) => {
    expect(() => readGithubRequiredChecks(runner(rules, response), request)).toThrow(
      /Required|too_big/,
    )
  },
)

it('preserves an external command error without retrying it', () => {
  const failure = new GithubRequiredChecksError('GitHub authentication failed')
  const execute = vi.fn(() => {
    throw failure
  })
  expect(() => readGithubRequiredChecks(execute, request)).toThrow(failure)
  expect(execute).toHaveBeenCalledOnce()
})

it('rejects a head changed after the check pages were collected', () => {
  expect(() =>
    readGithubRequiredChecks(runner(rules, page(), rules, page({ head: 'b'.repeat(40) })), request),
  ).toThrow('PR revisions changed')
})

it('rejects protection changed after the check pages were collected', () => {
  expect(() =>
    readGithubRequiredChecks(runner(rules, page(), rules, page({ protection })), request),
  ).toThrow('Branch protection changed')
})
