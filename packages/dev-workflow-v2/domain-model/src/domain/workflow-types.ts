import { z } from 'zod'
import type { WorkflowEvent } from './workflow-events'

const STATE_NAMES = [
  'IMPLEMENTING',
  'REVIEWING',
  'SUBMITTING_PR',
  'AWAITING_CI',
  'AWAITING_PR_FEEDBACK',
  'ADDRESSING_FEEDBACK',
  'REFLECTING',
  'COMPLETE',
  'BLOCKED',
] as const

type StateName = (typeof STATE_NAMES)[number]

const STATE_NAME_SCHEMA = z.enum(STATE_NAMES)

/**
 * @riviere-role domain-service
 * @riviere-role-justification PLACEHOLDER: Added before justification rule introduced.
 */
export function createWorkflowStateSchema<T extends readonly [string, ...string[]]>(stateNames: T) {
  const stateNameSchema = z.enum(stateNames)
  return z.object({
    currentStateMachineState: stateNameSchema,
    githubIssue: z.number().int().positive().optional(),
    featureBranch: z.string().optional(),
    prNumber: z.number().int().positive().optional(),
    prUrl: z.string().optional(),
    architectureReviewPassed: z.boolean(),
    codeReviewPassed: z.boolean(),
    bugScannerPassed: z.boolean(),
    taskCheckPassed: z.boolean(),
    ciPassed: z.boolean(),
    feedbackClean: z.boolean(),
    feedbackAddressed: z.boolean(),
    feedbackUnresolvedCount: z.number().optional(),
    prFeedbackVerificationFailedReason: z.string().optional(),
    preBlockedState: z.string().optional(),
    transcriptPath: z.string().optional(),
  })
}

const WORKFLOW_STATE_SCHEMA = createWorkflowStateSchema(STATE_NAMES)

function applyRecordedReviewVerdict(
  state: WorkflowState,
  event: Extract<WorkflowEvent, { type: 'review-recorded' }>,
): WorkflowState {
  const parsedReviewType = z
    .enum(['architecture-review', 'code-review', 'bug-scanner', 'task-check'])
    .safeParse(event.reviewType)
  if (!parsedReviewType.success) return state

  const passed = event.verdict === 'PASS'
  switch (parsedReviewType.data) {
    case 'architecture-review':
      return state.with({ architectureReviewPassed: passed })
    case 'code-review':
      return state.with({ codeReviewPassed: passed })
    case 'bug-scanner':
      return state.with({ bugScannerPassed: passed })
    case 'task-check':
      return state.with({ taskCheckPassed: passed })
  }
}

function applyReviewEvent(state: WorkflowState, event: WorkflowEvent): WorkflowState | undefined {
  switch (event.type) {
    case 'architecture-review-completed':
      return state.with({ architectureReviewPassed: event.passed })
    case 'code-review-completed':
      return state.with({ codeReviewPassed: event.passed })
    case 'bug-scanner-completed':
      return state.with({ bugScannerPassed: event.passed })
    case 'ci-completed':
      return state.with({ ciPassed: event.passed })
    case 'feedback-checked':
      return state.with({
        feedbackClean: event.clean,
        feedbackUnresolvedCount: event.unresolvedCount,
      })
    case 'feedback-addressed':
      return state.with({ feedbackAddressed: true })
    case 'pr-feedback-verification-failed':
      return state.with({ prFeedbackVerificationFailedReason: event.reason })
    case 'review-recorded':
      return applyRecordedReviewVerdict(state, event)
  }
  return undefined
}

/** @riviere-role value-object */
export class WorkflowState {
  declare private readonly brand: 'WorkflowState'

  readonly currentStateMachineState: StateName
  readonly githubIssue?: number
  readonly featureBranch?: string
  readonly prNumber?: number
  readonly prUrl?: string
  readonly architectureReviewPassed: boolean
  readonly codeReviewPassed: boolean
  readonly bugScannerPassed: boolean
  readonly taskCheckPassed: boolean
  readonly ciPassed: boolean
  readonly feedbackClean: boolean
  readonly feedbackAddressed: boolean
  readonly feedbackUnresolvedCount?: number
  readonly prFeedbackVerificationFailedReason?: string
  readonly preBlockedState?: string
  readonly transcriptPath?: string

  private constructor(value: z.infer<typeof WORKFLOW_STATE_SCHEMA>) {
    this.currentStateMachineState = value.currentStateMachineState
    this.architectureReviewPassed = value.architectureReviewPassed
    this.codeReviewPassed = value.codeReviewPassed
    this.bugScannerPassed = value.bugScannerPassed
    this.taskCheckPassed = value.taskCheckPassed
    this.ciPassed = value.ciPassed
    this.feedbackClean = value.feedbackClean
    this.feedbackAddressed = value.feedbackAddressed
    if (value.githubIssue !== undefined) this.githubIssue = value.githubIssue
    if (value.featureBranch !== undefined) this.featureBranch = value.featureBranch
    if (value.prNumber !== undefined) this.prNumber = value.prNumber
    if (value.prUrl !== undefined) this.prUrl = value.prUrl
    if (value.feedbackUnresolvedCount !== undefined) {
      this.feedbackUnresolvedCount = value.feedbackUnresolvedCount
    }
    if (value.prFeedbackVerificationFailedReason !== undefined) {
      this.prFeedbackVerificationFailedReason = value.prFeedbackVerificationFailedReason
    }
    if (value.preBlockedState !== undefined) this.preBlockedState = value.preBlockedState
    if (value.transcriptPath !== undefined) this.transcriptPath = value.transcriptPath
  }

  static parse(value: unknown): WorkflowState {
    return new WorkflowState(WORKFLOW_STATE_SCHEMA.parse(value))
  }

  static initial(): WorkflowState {
    return INITIAL_STATE
  }

  static replay(events: readonly WorkflowEvent[]): WorkflowState {
    return events.reduce((state, event) => state.apply(event), WorkflowState.initial())
  }

  with(changes: Partial<z.infer<typeof WORKFLOW_STATE_SCHEMA>>): WorkflowState {
    return WorkflowState.parse({
      ...this,
      ...changes,
    })
  }

  apply(event: WorkflowEvent): WorkflowState {
    if (event.type === 'transitioned') {
      return this.with({
        ...event.stateOverrides,
        currentStateMachineState: event.to,
        preBlockedState: event.to === 'BLOCKED' ? event.from : undefined,
      })
    }

    const reviewResult = applyReviewEvent(this, event)
    if (reviewResult !== undefined) return reviewResult

    switch (event.type) {
      case 'issue-recorded':
        return this.with({ githubIssue: event.issueNumber })
      case 'branch-recorded':
        return this.with({ featureBranch: event.branch })
      case 'pr-recorded':
        return this.with({ prNumber: event.prNumber, prUrl: event.prUrl })
      case 'task-check-passed':
        return this.with({ taskCheckPassed: true })
      case 'session-started':
        return this.with({
          ...(event.transcriptPath !== undefined && { transcriptPath: event.transcriptPath }),
        })
      default:
        return this
    }
  }
}

const INITIAL_STATE = WorkflowState.parse({
  currentStateMachineState: 'IMPLEMENTING',
  architectureReviewPassed: false,
  codeReviewPassed: false,
  bugScannerPassed: false,
  taskCheckPassed: false,
  ciPassed: false,
  feedbackClean: false,
  feedbackAddressed: false,
})

/**
 * @riviere-role domain-service
 * @riviere-role-justification PLACEHOLDER: Added before justification rule introduced.
 */
export function getWorkflowStateNames() {
  return STATE_NAMES
}

/**
 * @riviere-role domain-service
 * @riviere-role-justification PLACEHOLDER: Added before justification rule introduced.
 */
export function getWorkflowStateNameSchema() {
  return STATE_NAME_SCHEMA
}

/**
 * @riviere-role domain-service
 * @riviere-role-justification PLACEHOLDER: Added before justification rule introduced.
 */
export function getInitialWorkflowState(): WorkflowState {
  return WorkflowState.initial()
}
