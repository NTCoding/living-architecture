import { z } from 'zod'
import type { WorkflowEvent } from './workflow-events'
import { Reviewer } from './reviews/reviewers'
import { ReviewStatuses } from './reviews/statuses'

type ReviewerKey = z.infer<ReturnType<typeof Reviewer.schema>>
type ReviewerStatus = z.infer<ReturnType<typeof ReviewStatuses.schema>>
type ReviewerStatuses = {
  readonly 'architecture-review': ReviewerStatus
  readonly 'code-review': ReviewerStatus
  readonly 'bug-scanner': ReviewerStatus
  readonly 'task-check': ReviewerStatus
  readonly coderabbit: ReviewerStatus
}

const STATE_NAMES = [
  'IMPLEMENTING',
  'SUBMITTING_PR',
  'REVIEWING',
  'ADDRESSING_FEEDBACK',
  'HUMAN_REVIEWING',
  'BLOCKED',
] as const

type StateName = (typeof STATE_NAMES)[number]

const STATE_NAME_SCHEMA = z.enum(STATE_NAMES)
const REVIEWER_STATUS_SCHEMA = ReviewStatuses.schema()
const REVIEWER_STATUSES_SCHEMA = z
  .object({
    'architecture-review': REVIEWER_STATUS_SCHEMA,
    'code-review': REVIEWER_STATUS_SCHEMA,
    'bug-scanner': REVIEWER_STATUS_SCHEMA,
    'task-check': REVIEWER_STATUS_SCHEMA,
    coderabbit: REVIEWER_STATUS_SCHEMA,
  })
  .strict()

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
    reviewerStatuses: REVIEWER_STATUSES_SCHEMA,
    preBlockedState: z.string().optional(),
    transcriptPath: z.string().optional(),
  })
}

const WORKFLOW_STATE_SCHEMA = createWorkflowStateSchema(STATE_NAMES)

function applyReviewEvent(state: WorkflowState, event: WorkflowEvent): WorkflowState | undefined {
  if (event.type === 'reviewer-status-recorded')
    return applyReviewerStatus(state, event.reviewer, event.status)
  return undefined
}

function applyReviewerStatus(
  state: WorkflowState,
  reviewer: ReviewerKey,
  status: ReviewerStatus,
): WorkflowState {
  switch (reviewer) {
    case 'architecture-review':
      return state.with({
        reviewerStatuses: { ...state.reviewerStatuses, 'architecture-review': status },
      })
    case 'code-review':
      return state.with({ reviewerStatuses: { ...state.reviewerStatuses, 'code-review': status } })
    case 'bug-scanner':
      return state.with({ reviewerStatuses: { ...state.reviewerStatuses, 'bug-scanner': status } })
    case 'task-check':
      return state.with({ reviewerStatuses: { ...state.reviewerStatuses, 'task-check': status } })
    case 'coderabbit':
      return state.with({ reviewerStatuses: { ...state.reviewerStatuses, coderabbit: status } })
  }
}

/** @riviere-role value-object */
export class WorkflowState {
  declare private readonly brand: 'WorkflowState'

  readonly currentStateMachineState: StateName
  readonly githubIssue?: number
  readonly featureBranch?: string
  readonly prNumber?: number
  readonly prUrl?: string
  readonly reviewerStatuses: ReviewerStatuses
  readonly preBlockedState?: string
  readonly transcriptPath?: string

  private constructor(value: z.infer<typeof WORKFLOW_STATE_SCHEMA>) {
    this.currentStateMachineState = value.currentStateMachineState
    this.reviewerStatuses = value.reviewerStatuses
    if (value.githubIssue !== undefined) this.githubIssue = value.githubIssue
    if (value.featureBranch !== undefined) this.featureBranch = value.featureBranch
    if (value.prNumber !== undefined) this.prNumber = value.prNumber
    if (value.prUrl !== undefined) this.prUrl = value.prUrl
    if (value.preBlockedState !== undefined) this.preBlockedState = value.preBlockedState
    if (value.transcriptPath !== undefined) this.transcriptPath = value.transcriptPath
  }

  static parse(value: unknown): WorkflowState {
    return new WorkflowState(WORKFLOW_STATE_SCHEMA.parse(value))
  }

  static stateNameSchema() {
    return STATE_NAME_SCHEMA
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
  reviewerStatuses: ReviewStatuses.pending(),
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
export function getInitialWorkflowState(): WorkflowState {
  return WorkflowState.initial()
}
