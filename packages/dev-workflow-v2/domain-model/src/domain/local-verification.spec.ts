import { vi } from 'vitest'
import { WorkflowState } from './workflow-types'
import { buildTestWorkflow, makeDeps, transitioned } from './__fixtures__/workflow-test-fixtures'
import { VerifyingState } from './states/verifying'

class VerificationFixtureError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'VerificationFixtureError'
  }
}

const headCommit = 'b'.repeat(40)
const gitInfo = { ...makeDeps().getGitInfo(), headCommit }
const verifying = WorkflowState.initial().with({ currentStateMachineState: 'VERIFYING' })
const stateDefinition = VerifyingState.parse('VERIFYING')

it('records the exact commit after local verification succeeds', () => {
  const runLocalVerification = vi.fn()
  const workflow = buildTestWorkflow(
    makeDeps({ getGitInfo: () => gitInfo, runLocalVerification }),
    verifying,
  )
  expect(workflow.verifyLocal()).toStrictEqual({ pass: true })
  expect(runLocalVerification).toHaveBeenCalledOnce()
  expect(
    WorkflowState.replay([
      transitioned('IMPLEMENTING', 'VERIFYING'),
      ...workflow.getPendingEvents(),
    ]),
  ).toMatchObject({
    currentStateMachineState: 'VERIFYING',
    localVerification: { status: 'passed', headCommit },
  })
})

it('records the failure before entering BLOCKED when local checks fail', () => {
  const workflow = buildTestWorkflow(
    makeDeps({
      getGitInfo: () => gitInfo,
      runLocalVerification: () => {
        throw new VerificationFixtureError('pnpm verify exited with code 1: test failed')
      },
    }),
    verifying,
  )
  expect(workflow.verifyLocal()).toStrictEqual({
    pass: false,
    reason:
      'Local verification failed: VerificationFixtureError: pnpm verify exited with code 1: test failed',
  })
  expect(workflow.getPendingEvents()).toMatchObject([
    {
      type: 'local-verification-completed',
      result: {
        status: 'failed',
        reason:
          'Local verification failed: VerificationFixtureError: pnpm verify exited with code 1: test failed',
      },
    },
    { type: 'transitioned', from: 'VERIFYING', to: 'BLOCKED' },
  ])
})

it('does not run local checks outside VERIFYING', () => {
  const runLocalVerification = vi.fn()
  const workflow = buildTestWorkflow(makeDeps({ runLocalVerification }))
  expect(workflow.verifyLocal().pass).toBe(false)
  expect(runLocalVerification).not.toHaveBeenCalled()
  expect(workflow.getPendingEvents()).toStrictEqual([])
})

it('does not run local checks against an uncommitted worktree', () => {
  const runLocalVerification = vi.fn()
  const workflow = buildTestWorkflow(
    makeDeps({ getGitInfo: () => ({ ...gitInfo, workingTreeClean: false }), runLocalVerification }),
    verifying,
  )
  expect(workflow.verifyLocal().pass).toBe(false)
  expect(runLocalVerification).not.toHaveBeenCalled()
  expect(workflow.getState()).toMatchObject({
    currentStateMachineState: 'BLOCKED',
    localVerification: { status: 'failed' },
  })
})

it.each([
  { ...gitInfo, headCommit: 'c'.repeat(40) },
  { ...gitInfo, workingTreeClean: false },
])('rejects a worktree that changes during verification: %j', (after) => {
  const getGitInfo = vi.fn().mockReturnValueOnce(gitInfo).mockReturnValue(after)
  const workflow = buildTestWorkflow(makeDeps({ getGitInfo }), verifying)
  expect(workflow.verifyLocal()).toStrictEqual({
    pass: false,
    reason:
      'Local verification failed: WorkflowStateError: The worktree changed during local verification.',
  })
  expect(workflow.getState().currentStateMachineState).toBe('BLOCKED')
})

it('invalidates prior verification when VERIFYING is entered again', () => {
  const prior = verifying.with({ localVerification: { status: 'passed', headCommit } })
  const next = stateDefinition.onEntry(prior)
  expect(next.localVerification).toStrictEqual({ status: 'not-run' })
  expect(next.transitionOverridesFrom(prior)).toStrictEqual({
    localVerification: { status: 'not-run' },
  })
})

it.each([
  { state: verifying, gitInfo, to: 'BLOCKED', pass: true },
  { state: verifying, gitInfo, to: 'SUBMITTING_PR', pass: false },
  {
    state: verifying.with({ localVerification: { status: 'passed', headCommit } }),
    gitInfo,
    to: 'SUBMITTING_PR',
    pass: true,
  },
  {
    state: verifying.with({ localVerification: { status: 'passed', headCommit } }),
    gitInfo: { ...gitInfo, headCommit: 'c'.repeat(40) },
    to: 'SUBMITTING_PR',
    pass: false,
  },
  {
    state: verifying.with({ localVerification: { status: 'passed', headCommit } }),
    gitInfo: { ...gitInfo, workingTreeClean: false },
    to: 'SUBMITTING_PR',
    pass: false,
  },
] as const)('permits $to only with current verification: $pass', (scenario) => {
  expect(stateDefinition.transitionGuard({ ...scenario, from: 'VERIFYING' }).pass).toBe(
    scenario.pass,
  )
})
