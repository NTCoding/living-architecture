import { vi } from 'vitest'
import { WorkflowState } from './workflow-types'
import { buildTestWorkflow, makeDeps } from './__fixtures__/workflow-test-fixtures'
import { CREATE_PR_OPTIONS } from './__fixtures__/pull-request-options'
import { SubmittingPrState } from './states/submitting-pr'

const differentHead = 'c'.repeat(40)
const gitInfo = makeDeps().getGitInfo()
const submitting = WorkflowState.initial().with({
  currentStateMachineState: 'SUBMITTING_PR',
  githubIssue: 42,
  featureBranch: 'issue-42',
})
const verified = submitting.with({
  localVerification: { status: 'passed', headCommit: gitInfo.headCommit },
})
const recorded = verified.with({
  pullRequestSnapshot: {
    repository: 'example/repo',
    issue: 42,
    branch: 'issue-42',
    prNumber: 99,
    prUrl: 'https://github.com/example/repo/pull/99',
    baseRevision: 'a'.repeat(40),
    headRevision: gitInfo.headCommit,
  },
})
const definition = SubmittingPrState.parse('SUBMITTING_PR')

it.each([
  { state: submitting, gitInfo },
  { state: verified, gitInfo: { ...gitInfo, headCommit: differentHead } },
  { state: verified, gitInfo: { ...gitInfo, workingTreeClean: false } },
])('does not submit unverified work to GitHub: %j', (scenario) => {
  const createPullRequest = vi.fn(makeDeps().createPullRequest)
  const workflow = buildTestWorkflow(
    makeDeps({ getGitInfo: () => scenario.gitInfo, createPullRequest }),
    scenario.state,
  )
  expect(workflow.createPr(CREATE_PR_OPTIONS)).toStrictEqual({
    pass: false,
    reason: 'Local verification must pass for the current clean commit before creating a PR.',
  })
  expect(createPullRequest).not.toHaveBeenCalled()
  expect(workflow.getPendingEvents()).toStrictEqual([])
})

it.each([
  { state: submitting, gitInfo, pass: false },
  { state: recorded.with({ localVerification: { status: 'not-run' } }), gitInfo, pass: false },
  {
    state: recorded.with({ localVerification: { status: 'passed', headCommit: differentHead } }),
    gitInfo,
    pass: false,
  },
  {
    state: recorded.with({ localVerification: { status: 'passed', headCommit: differentHead } }),
    gitInfo: { ...gitInfo, headCommit: differentHead },
    pass: false,
  },
  { state: recorded, gitInfo: { ...gitInfo, workingTreeClean: false }, pass: false },
  { state: recorded, gitInfo, pass: true },
])('requires a PR snapshot matching current verification before review: $pass', (scenario) => {
  expect(
    definition.transitionGuard({ ...scenario, from: 'SUBMITTING_PR', to: 'REVIEWING' }).pass,
  ).toBe(scenario.pass)
})

it('allows a submission failure to be blocked', () => {
  expect(
    definition.transitionGuard({
      state: submitting,
      gitInfo,
      from: 'SUBMITTING_PR',
      to: 'BLOCKED',
    }),
  ).toStrictEqual({ pass: true })
})

it.each([
  { architectureReviewPassed: false },
  { codeReviewPassed: false },
  { bugScannerPassed: false },
  { taskCheckPassed: false },
])('does not allow the legacy CI path to bypass an outstanding review: %j', (pendingReview) => {
  const state = recorded.with({
    prNumber: 99,
    architectureReviewPassed: true,
    codeReviewPassed: true,
    bugScannerPassed: true,
    taskCheckPassed: true,
    ...pendingReview,
  })
  expect(
    definition.transitionGuard({ state, gitInfo, from: 'SUBMITTING_PR', to: 'AWAITING_CI' }),
  ).toStrictEqual({ pass: false, reason: 'Complete the workflow review before awaiting CI.' })
})
