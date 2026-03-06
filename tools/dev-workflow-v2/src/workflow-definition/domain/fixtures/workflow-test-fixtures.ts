import { workflowSpec } from '@ntcoding/agentic-workflow-builder/testing'
import type { WorkflowEvent } from '../workflow-events'
import type { WorkflowState } from '../workflow-types'
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

export const gitWithCommits: GitInfo = {
  ...cleanGit,
  hasCommitsVsDefault: true,
  changedFilesVsDefault: ['src/foo.ts'],
}

export function makeDeps(overrides?: Partial<WorkflowDeps>): WorkflowDeps {
  return {
    getGitInfo: () => cleanGit,
    checkPrChecks: () => true,
    now: () => AT,
    ...overrides,
  }
}

export function issueRecorded(n: number): WorkflowEvent {
  return {
    type: 'issue-recorded',
    at: AT,
    issueNumber: n,
  }
}

export function branchRecorded(b: string): WorkflowEvent {
  return {
    type: 'branch-recorded',
    at: AT,
    branch: b,
  }
}

export function transitioned(from: string, to: string): WorkflowEvent {
  return {
    type: 'transitioned',
    at: AT,
    from,
    to,
  }
}

export function verifyPassed(): WorkflowEvent {
  return {
    type: 'verify-completed',
    at: AT,
    passed: true,
  }
}

export function verifyFailed(): WorkflowEvent {
  return {
    type: 'verify-completed',
    at: AT,
    passed: false,
    output: 'lint errors',
  }
}

export function reviewPassed(): WorkflowEvent {
  return {
    type: 'review-completed',
    at: AT,
    passed: true,
  }
}

export function reviewFailed(): WorkflowEvent {
  return {
    type: 'review-completed',
    at: AT,
    passed: false,
    failedReviewers: ['code-review'],
  }
}

export function prRecorded(n: number, url?: string): WorkflowEvent {
  return {
    type: 'pr-recorded',
    at: AT,
    prNumber: n,
    ...(url === undefined ? {} : { prUrl: url }),
  }
}

export function ciPassed(): WorkflowEvent {
  return {
    type: 'ci-completed',
    at: AT,
    passed: true,
  }
}

export function ciFailed(): WorkflowEvent {
  return {
    type: 'ci-completed',
    at: AT,
    passed: false,
    output: 'test failures',
  }
}

export function feedbackClean(): WorkflowEvent {
  return {
    type: 'feedback-checked',
    at: AT,
    clean: true,
  }
}

export function feedbackExists(count: number): WorkflowEvent {
  return {
    type: 'feedback-checked',
    at: AT,
    clean: false,
    unresolvedCount: count,
  }
}

export function feedbackAddressed(): WorkflowEvent {
  return {
    type: 'feedback-addressed',
    at: AT,
  }
}

export function reflectionWritten(path: string): WorkflowEvent {
  return {
    type: 'reflection-written',
    at: AT,
    path,
  }
}

export function eventsToVerifying(): readonly WorkflowEvent[] {
  return [issueRecorded(42), branchRecorded('issue-42'), transitioned('IMPLEMENTING', 'VERIFYING')]
}

export function eventsToReviewing(): readonly WorkflowEvent[] {
  return [...eventsToVerifying(), verifyPassed(), transitioned('VERIFYING', 'REVIEWING')]
}

export function eventsToSubmittingPr(): readonly WorkflowEvent[] {
  return [...eventsToReviewing(), reviewPassed(), transitioned('REVIEWING', 'SUBMITTING_PR')]
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
    transitioned('CHECKING_FEEDBACK', 'ADDRESSING_FEEDBACK'),
  ]
}

export function eventsToReflecting(): readonly WorkflowEvent[] {
  return [
    ...eventsToCheckingFeedback(),
    feedbackClean(),
    transitioned('CHECKING_FEEDBACK', 'REFLECTING'),
  ]
}

export function eventsToComplete(): readonly WorkflowEvent[] {
  return [
    ...eventsToReflecting(),
    reflectionWritten('/test-output/reflection.md'),
    transitioned('REFLECTING', 'COMPLETE'),
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
