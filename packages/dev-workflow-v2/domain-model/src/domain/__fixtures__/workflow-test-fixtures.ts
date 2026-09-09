import { workflowSpec } from '@nt-ai-lab/deterministic-agent-workflow-engine'
import type { WorkflowEvent } from '../workflow-events'
import { WorkflowState } from '../workflow-types'
import { MaintainerWorkflow } from '../workflow'
import { MaintainerWorkflowRegistry } from '../registry'
import { AddressingFeedbackState } from '../states/addressing-feedback'
import { BlockedState } from '../states/blocked'
import { HumanReviewingState } from '../states/human-reviewing'
import { ImplementingState } from '../states/implementing'
import { ReviewingState } from '../states/reviewing'
import { SubmittingPrState } from '../states/submitting-pr'
import type { GitInfo } from '@nt-ai-lab/deterministic-agent-workflow-dsl'

type WorkflowDeps = Parameters<typeof MaintainerWorkflow.build>[1]
type StateName = WorkflowState['currentStateMachineState']

const AT = '2026-01-01T00:00:00Z'

export const TEST_WORKFLOW_REGISTRY = MaintainerWorkflowRegistry.parse({
  IMPLEMENTING: ImplementingState.parse('IMPLEMENTING'),
  REVIEWING: ReviewingState.parse('REVIEWING'),
  SUBMITTING_PR: SubmittingPrState.parse('SUBMITTING_PR'),
  ADDRESSING_FEEDBACK: AddressingFeedbackState.parse('ADDRESSING_FEEDBACK'),
  HUMAN_REVIEWING: HumanReviewingState.parse('HUMAN_REVIEWING'),
  BLOCKED: BlockedState.parse('BLOCKED'),
})

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
      reviewerStatuses: {
        'architecture-review': 'APPROVED',
        'code-review': 'APPROVED',
        'bug-scanner': 'APPROVED',
        'task-check': 'APPROVED',
        coderabbit: 'APPROVED',
      },
      reviewDecision: null,
      coderabbitReviewSeen: true,
      unresolvedCount: 0,
      threads: [],
    }),
    createPullRequest: () => ({
      prNumber: 99,
      prUrl: 'https://github.com/example/repo/pull/99',
      isDraft: false,
    }),
    listSessionReviews: () => [],
    sleepMs: () => undefined,
    now: () => AT,
    reviewLauncher: {
      run: () => undefined,
    },
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

export function eventsToReviewing(): readonly WorkflowEvent[] {
  return [issueRecorded(42), branchRecorded('issue-42'), transitioned('IMPLEMENTING', 'REVIEWING')]
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
