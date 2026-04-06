import { workflowSpec } from '@ntcoding/agentic-workflow-builder/testing'
import type { WorkflowEvent } from '../workflow-events'
import type {
  WorkflowState, StateName 
} from '../workflow-types'
import type { WorkflowDeps } from '../workflow'
import { Workflow } from '../workflow'
import { applyEvents } from '../fold'
import type { GitInfo } from '@ntcoding/agentic-workflow-builder/dsl'

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
    checkPrChecks: () => true,
    getPrFeedback: () => ({
      unresolvedCount: 0,
      threads: [],
    }),
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

function architectureReviewPassed(): WorkflowEvent {
  return {
    type: 'architecture-review-completed',
    at: AT,
    passed: true,
  }
}

function codeReviewPassed(): WorkflowEvent {
  return {
    type: 'code-review-completed',
    at: AT,
    passed: true,
  }
}

export function codeReviewFailed(): WorkflowEvent {
  return {
    type: 'code-review-completed',
    at: AT,
    passed: false,
  }
}

function bugScannerPassed(): WorkflowEvent {
  return {
    type: 'bug-scanner-completed',
    at: AT,
    passed: true,
  }
}

function allReviewsPassed(): readonly WorkflowEvent[] {
  return [architectureReviewPassed(), codeReviewPassed(), bugScannerPassed()]
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

function feedbackClean(): WorkflowEvent {
  return {
    type: 'feedback-checked',
    at: AT,
    clean: true,
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

export function eventsToCheckingFeedback(): readonly WorkflowEvent[] {
  return [...eventsToAwaitingCi(), ciPassed(), transitioned('AWAITING_CI', 'CHECKING_FEEDBACK')]
}

export function eventsToAddressingFeedback(): readonly WorkflowEvent[] {
  return [
    ...eventsToCheckingFeedback(),
    feedbackExists(3),
    transitioned('CHECKING_FEEDBACK', 'ADDRESSING_FEEDBACK', {
      feedbackAddressed: false,
      feedbackClean: false,
      feedbackAddressedCount: undefined,
    }),
  ]
}

export function eventsToReflecting(): readonly WorkflowEvent[] {
  return [
    ...eventsToCheckingFeedback(),
    feedbackClean(),
    transitioned('CHECKING_FEEDBACK', 'REFLECTING'),
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
