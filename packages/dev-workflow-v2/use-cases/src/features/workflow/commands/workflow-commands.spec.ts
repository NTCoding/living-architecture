import { makeWorkflowDeps } from './__fixtures__/workflow-dependencies'
import { CreatePullRequest } from './create-pull-request'
import { RecordBranch } from './record-branch'
import { RecordCiFailed } from './record-ci-failed'
import { RecordCiPassed } from './record-ci-passed'
import { RecordIssue } from './record-issue'
import { RecordPullRequest } from './record-pull-request'
import { VerifyFeedbackAddressed } from './verify-feedback-addressed'
import { VerifyLocal } from './verify-local'
import { configureWorkflow } from './configure-workflow'

const definition = configureWorkflow({})
const deps = makeWorkflowDeps()
const initial = definition.initialState()

it('records successful local verification for the current head', () => {
  const workflow = definition.buildWorkflow(
    initial.with({ currentStateMachineState: 'VERIFYING' }),
    deps,
  )
  expect(new VerifyLocal(workflow).execute({})).toStrictEqual({ result: { pass: true } })
  expect(deps.runLocalVerification).toHaveBeenCalledOnce()
  expect(workflow.getState().localVerification).toStrictEqual({
    status: 'passed',
    headCommit: deps.getGitInfo().headCommit,
  })
})

it('records the PR snapshot returned for verified implementation', () => {
  const workflow = definition.buildWorkflow(
    initial.with({
      currentStateMachineState: 'SUBMITTING_PR',
      githubIssue: 42,
      featureBranch: 'feature/test',
      localVerification: { status: 'passed', headCommit: deps.getGitInfo().headCommit },
    }),
    deps,
  )
  expect(
    new CreatePullRequest(workflow).execute({
      arguments: [
        '--title',
        'Verified change',
        '--description',
        'A'.repeat(100),
        '--problem',
        'The reported problem',
        '--acceptance-criteria',
        'The approved criteria',
        '--key-changes',
        'The approved change',
        '--architecture-impact',
        'None',
        '--validation',
        'pnpm verify',
        '--notes',
        'None',
      ],
    }),
  ).toStrictEqual({ result: { pass: true } })
  expect(workflow.getState().pullRequestSnapshot).toStrictEqual({
    repository: 'example/repo',
    issue: 42,
    branch: 'feature/test',
    prNumber: 1,
    prUrl: 'https://github.com/example/repo/pull/1',
    baseRevision: 'a'.repeat(40),
    headRevision: 'b'.repeat(40),
  })
})

it('records the supplied feature branch', () => {
  const workflow = definition.buildWorkflow(initial, deps)
  expect(new RecordBranch(workflow).execute({ branch: 'feature/test' })).toStrictEqual({
    result: { pass: true },
  })
  expect(workflow.getState().featureBranch).toBe('feature/test')
})

it('records failed CI with the supplied output', () => {
  const workflow = definition.buildWorkflow(
    initial.with({ currentStateMachineState: 'AWAITING_CI', ciPassed: true }),
    deps,
  )
  expect(new RecordCiFailed(workflow).execute({ output: 'failed assertion' })).toStrictEqual({
    result: { pass: true },
  })
  expect(workflow.getState().ciPassed).toBe(false)
  expect(workflow.getPendingEvents()).toMatchObject([
    { type: 'ci-completed', passed: false, output: 'failed assertion' },
  ])
})

it('records passed CI', () => {
  const workflow = definition.buildWorkflow(
    initial.with({ currentStateMachineState: 'AWAITING_CI' }),
    deps,
  )
  expect(new RecordCiPassed(workflow).execute({})).toStrictEqual({ result: { pass: true } })
  expect(workflow.getState().ciPassed).toBe(true)
})

it('records the supplied issue number', () => {
  const workflow = definition.buildWorkflow(initial, deps)
  expect(new RecordIssue(workflow).execute({ issueNumber: 42 })).toStrictEqual({
    result: { pass: true },
  })
  expect(workflow.getState().githubIssue).toBe(42)
})

it('records the supplied legacy PR number and URL', () => {
  const workflow = definition.buildWorkflow(
    initial.with({ currentStateMachineState: 'SUBMITTING_PR' }),
    deps,
  )
  expect(
    new RecordPullRequest(workflow).execute({
      number: 42,
      url: 'https://github.com/example/repo/pull/42',
    }),
  ).toStrictEqual({ result: { pass: true } })
  expect(workflow.getState()).toMatchObject({
    prNumber: 42,
    prUrl: 'https://github.com/example/repo/pull/42',
  })
})

it('reflects when addressed feedback is verified clean', () => {
  const workflow = definition.buildWorkflow(
    initial.with({ currentStateMachineState: 'ADDRESSING_FEEDBACK', prNumber: 1 }),
    deps,
  )
  expect(new VerifyFeedbackAddressed(workflow).execute({})).toStrictEqual({
    result: { pass: true },
  })
  expect(workflow.getState().currentStateMachineState).toBe('REFLECTING')
})
