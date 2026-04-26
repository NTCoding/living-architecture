import { workflowSpec } from '@nt-ai-lab/deterministic-agent-workflow-engine'
import type { WorkflowEvent } from '../workflow-events'
import type {
  WorkflowState, StateName, LivingArchitectureReviewType 
} from '../workflow-types'
import type { WorkflowDeps } from '../workflow'
import { Workflow } from '../workflow'
import { applyEvents } from '../fold'
import type { GitInfo } from '@nt-ai-lab/deterministic-agent-workflow-dsl'

const AT = '2026-01-01T00:00:00Z'

const cleanGit: GitInfo = {
  currentBranch: 'issue-42',
  workingTreeClean: true,
  headCommit: 'abc123',
  changedFilesVsDefault: [],
  hasCommitsVsDefault: false,
}

export function makeDeps(overrides?: Partial<WorkflowDeps>): WorkflowDeps {
  return {
    getGitInfo: () => cleanGit,
    getPrFeedback: () => ({
      reviewDecision: null,
      coderabbitReviewSeen: true,
      unresolvedCount: 0,
      threads: [],
    }),
    sleepMs: () => undefined,
    now: () => AT,
    ...overrides,
  }
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
  reviewType: LivingArchitectureReviewType,
  verdict: 'PASS' | 'FAIL',
): WorkflowEvent {
  return {
    type: 'review-recorded',
    at: AT,
    reviewId: 1,
    reviewType,
    verdict,
  }
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
  return [...eventsToReviewing(), ...allReviewsPassed(), transitioned('REVIEWING', 'SUBMITTING_PR')]
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

export const spec = workflowSpec<WorkflowEvent, WorkflowState, WorkflowDeps, Workflow>({
  fold: applyEvents,
  rehydrate: (state, deps) => Workflow.rehydrate(state, deps),
  defaultDeps: makeDeps,
  getPendingEvents: (wf) => wf.getPendingEvents(),
  getState: (wf) => wf.getState(),
  mergeDeps: (defaults, overrides) => ({
    ...defaults,
    ...overrides,
  }),
})
