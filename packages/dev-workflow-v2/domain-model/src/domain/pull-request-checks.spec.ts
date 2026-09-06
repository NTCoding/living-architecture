import { PullRequestChecks } from './pull-request-checks'

const headRevision = 'a'.repeat(40)
const check = { name: 'build', status: 'passed', detailsUrl: null }

it.each([
  ['passed', 'passed'],
  ['pending', 'pending'],
  ['failed', 'failed'],
  ['indeterminate', 'blocked'],
])('classifies %s checks as %s', (status, expected) => {
  expect(
    PullRequestChecks.parse({ headRevision, checks: [{ ...check, status }] }).assessFor(
      headRevision,
    ).status,
  ).toBe(expected)
})

it('blocks results from a different head', () => {
  expect(
    PullRequestChecks.parse({ headRevision, checks: [check] }).assessFor('b'.repeat(40)),
  ).toStrictEqual({
    status: 'blocked',
    reason: 'Required checks do not belong to the current PR head.',
  })
})

it.each([
  [['passed', 'pending'], 'pending'],
  [['pending', 'failed'], 'failed'],
  [['failed', 'indeterminate'], 'blocked'],
])('prioritises incomplete or failed evidence: %j', (statuses, expected) => {
  const checks = statuses.map((status) => ({ ...check, status }))
  expect(PullRequestChecks.parse({ headRevision, checks }).assessFor(headRevision).status).toBe(
    expected,
  )
})

it('rejects an empty required-check set', () => {
  expect(() => PullRequestChecks.parse({ headRevision, checks: [] })).toThrow('at least 1')
})
