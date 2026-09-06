import { VerifyingState } from '../states/verifying'
import { workflowSpec } from '@nt-ai-lab/deterministic-agent-workflow-engine'
import type { WorkflowEvent } from '../workflow-events'
import { WorkflowState } from '../workflow-types'
import { MaintainerWorkflow } from '../workflow'
import { MaintainerWorkflowRegistry } from '../registry'
import { AddressingFeedbackState } from '../states/addressing-feedback'
import { AwaitingCiState } from '../states/awaiting-ci'
import { AwaitingPrFeedbackState } from '../states/awaiting-pr-feedback'
import { BlockedState } from '../states/blocked'
import { CompleteState } from '../states/complete'
import { ImplementingState } from '../states/implementing'
import { ReflectingState } from '../states/reflecting'
import { ReviewingState } from '../states/reviewing'
import { SubmittingPrState } from '../states/submitting-pr'

type WorkflowDeps = Parameters<typeof MaintainerWorkflow.build>[1]
type StateName = WorkflowState['currentStateMachineState']

const AT = '2026-01-01T00:00:00Z'

export const TEST_WORKFLOW_REGISTRY = MaintainerWorkflowRegistry.parse({
  IMPLEMENTING: ImplementingState.parse('IMPLEMENTING'),
  VERIFYING: VerifyingState.parse('VERIFYING'),
  REVIEWING: ReviewingState.parse('REVIEWING'),
  SUBMITTING_PR: SubmittingPrState.parse('SUBMITTING_PR'),
  AWAITING_CI: AwaitingCiState.parse('AWAITING_CI'),
  AWAITING_PR_FEEDBACK: AwaitingPrFeedbackState.parse('AWAITING_PR_FEEDBACK'),
  ADDRESSING_FEEDBACK: AddressingFeedbackState.parse('ADDRESSING_FEEDBACK'),
  REFLECTING: ReflectingState.parse('REFLECTING'),
  COMPLETE: CompleteState.parse('COMPLETE'),
  BLOCKED: BlockedState.parse('BLOCKED'),
})

const cleanGit: ReturnType<WorkflowDeps['getGitInfo']> = {
  defaultBranch: 'main',
  currentBranch: 'issue-42',
  workingTreeClean: true,
  headCommit: 'b'.repeat(40),
  changedFilesVsDefault: [],
  hasCommitsVsDefault: false,
}

export function makeDeps(overrides?: Partial<WorkflowDeps>): WorkflowDeps {
  return {
    getGitInfo: () => cleanGit,
    runLocalVerification: () => undefined,
    getRequiredPullRequestChecks: () => ({
      headRevision: 'b'.repeat(40),
      checks: [{ name: 'main', status: 'passed', detailsUrl: null }],
    }),
    getPrFeedback: () => ({
      reviewDecision: null,
      coderabbitReviewSeen: true,
      unresolvedCount: 0,
      threads: [],
    }),
    createPullRequest: () => ({
      prNumber: 99,
      prUrl: 'https://github.com/example/repo/pull/99',
      isDraft: false,
      repository: 'example/repo',
      baseRevision: 'a'.repeat(40),
      headRevision: 'b'.repeat(40),
    }),
    listSessionReviews: () => [],
    sleepMs: () => undefined,
    now: () => AT,
    ...overrides,
  }
}

export function buildTestWorkflow(
  deps: WorkflowDeps = makeDeps(),
  state: unknown = WorkflowState.initial(),
): MaintainerWorkflow {
  return MaintainerWorkflow.build(TEST_WORKFLOW_REGISTRY, deps, state)
}

export function rehydrateTestWorkflow(
  state: unknown,
  deps: WorkflowDeps = makeDeps(),
): MaintainerWorkflow {
  return buildTestWorkflow(deps, state)
}

function issueRecorded(n: number): WorkflowEvent {
  return {
    type: 'issue-recorded',
    at: AT,
    issueNumber: n,
  }
}

function branchRecorded(b: string): WorkflowEvent {
  return {
    type: 'branch-recorded',
    at: AT,
    branch: b,
  }
}

export function transitioned(
  from: StateName,
  to: StateName,
  stateOverrides?: Record<string, unknown>,
): WorkflowEvent {
  return {
    type: 'transitioned',
    at: AT,
    from,
    to,
    ...(stateOverrides === undefined ? {} : { stateOverrides }),
  }
}

export function unresolvedThread(id: string): {
  id: string
  isResolved: false
  isOutdated: false
  path: string
  line: number
  comments: readonly []
} {
  return {
    id,
    isResolved: false,
    isOutdated: false,
    path: `${id}.ts`,
    line: 1,
    comments: [],
  }
}

export function reviewRecorded(
  reviewType: 'architecture-review' | 'code-review' | 'bug-scanner' | 'task-check',
  verdict: 'PASS' | 'FAIL',
): WorkflowEvent {
  return { type: 'review-recorded', at: AT, reviewId: 1, reviewType, verdict }
}

export function codeReviewFailed(): WorkflowEvent {
  return {
    type: 'code-review-completed',
    at: AT,
    passed: false,
  }
}

function allReviewsPassed(): readonly WorkflowEvent[] {
  return [
    reviewRecorded('architecture-review', 'PASS'),
    reviewRecorded('code-review', 'PASS'),
    reviewRecorded('bug-scanner', 'PASS'),
    reviewRecorded('task-check', 'PASS'),
  ]
}

function prRecorded(n: number, url?: string): WorkflowEvent {
  return {
    type: 'pr-recorded',
    at: AT,
    prNumber: n,
    ...(url === undefined ? {} : { prUrl: url }),
  }
}

function ciPassed(): WorkflowEvent {
  return {
    type: 'ci-completed',
    at: AT,
    passed: true,
  }
}

function feedbackExists(count: number): WorkflowEvent {
  return {
    type: 'feedback-checked',
    at: AT,
    clean: false,
    unresolvedCount: count,
  }
}

export function eventsToReviewing(): readonly WorkflowEvent[] {
  return [issueRecorded(42), branchRecorded('issue-42'), transitioned('IMPLEMENTING', 'REVIEWING')]
}

export function eventsToSubmittingPr(): readonly WorkflowEvent[] {
  return [
    ...eventsToReviewing(),
    ...allReviewsPassed(),
    {
      type: 'local-verification-completed',
      result: { status: 'passed', headCommit: 'b'.repeat(40) },
      at: AT,
    },
    transitioned('REVIEWING', 'SUBMITTING_PR'),
  ]
}

export function eventsToAwaitingCi(): readonly WorkflowEvent[] {
  return [...eventsToSubmittingPr(), prRecorded(99), transitioned('SUBMITTING_PR', 'AWAITING_CI')]
}

export function eventsToAwaitingPrFeedback(): readonly WorkflowEvent[] {
  return [...eventsToAwaitingCi(), ciPassed(), transitioned('AWAITING_CI', 'AWAITING_PR_FEEDBACK')]
}

export function eventsToAddressingFeedback(): readonly WorkflowEvent[] {
  return [
    ...eventsToAwaitingPrFeedback(),
    feedbackExists(3),
    transitioned('AWAITING_PR_FEEDBACK', 'ADDRESSING_FEEDBACK', {
      feedbackAddressed: false,
      feedbackClean: false,
    }),
  ]
}

export const spec = workflowSpec<WorkflowEvent, WorkflowState, WorkflowDeps, MaintainerWorkflow>({
  fold: WorkflowState.replay,
  rehydrate: (state, deps) => buildTestWorkflow(deps, state),
  defaultDeps: makeDeps,
  getPendingEvents: (wf) => wf.getPendingEvents(),
  getState: (wf) => wf.getState(),
  mergeDeps: (defaults, overrides) => ({
    ...defaults,
    ...overrides,
  }),
})
