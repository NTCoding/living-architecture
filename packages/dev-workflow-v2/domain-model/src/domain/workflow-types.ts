import { z, type ZodType } from 'zod'
import type { WorkflowEvent } from './workflow-events'
import { Reviewer, Reviewers } from './reviews/reviewers'
import { ReviewerStatus, ReviewStatuses } from './reviews/statuses'
import { ReviewerStatuses } from './reviews/reviewer-statuses'

const WORKFLOW_STATE_NAMES = [
  'IMPLEMENTING',
  'SUBMITTING_PR',
  'REVIEWING',
  'ADDRESSING_FEEDBACK',
  'HUMAN_REVIEWING',
  'BLOCKED',
] as const

const WORKFLOW_STATE_NAME_SCHEMA = z.enum(WORKFLOW_STATE_NAMES)

type WorkflowStateNameValue = z.infer<typeof WORKFLOW_STATE_NAME_SCHEMA>

/** @riviere-role domain-error */
export class InvalidWorkflowStateName extends Error {
  constructor(value: string) {
    super(`Unknown workflow state name: ${value}`)
    this.name = 'InvalidWorkflowStateName'
  }
}

/** @riviere-role value-object */
export class WorkflowStateName {
  declare private readonly brand: 'WorkflowStateName'

  private constructor(private readonly stateName: WorkflowStateNameValue) {}

  static fromName(value: string): WorkflowStateName {
    const result = WORKFLOW_STATE_NAME_SCHEMA.safeParse(value)
    if (!result.success) {
      throw new InvalidWorkflowStateName(value)
    }
    return new WorkflowStateName(result.data)
  }

  static parse(value: unknown): WorkflowStateName {
    return new WorkflowStateName(WORKFLOW_STATE_NAME_SCHEMA.parse(value))
  }

  name(): WorkflowStateNameValue {
    return this.stateName
  }
}

/** @riviere-role value-object */
export class WorkflowStateNames {
  declare private readonly brand: 'WorkflowStateNames'

  private constructor(private readonly names: readonly WorkflowStateName[]) {}

  static singleton(): WorkflowStateNames {
    return new WorkflowStateNames(
      WORKFLOW_STATE_NAME_SCHEMA.options.map((name) => WorkflowStateName.fromName(name)),
    )
  }

  asZodSchema(): ZodType<WorkflowStateNameValue> {
    return WORKFLOW_STATE_NAME_SCHEMA
  }

  all(): readonly WorkflowStateName[] {
    return [...this.names]
  }
}

export type { WorkflowStateNameValue }

const REVIEWER_STATUS_SCHEMA = ReviewStatuses.singleton().asZodSchema()
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
    reviewCycleNumber: z.number().int().nonnegative().optional(),
    reviewCycleOpen: z.boolean().optional(),
    reviewCycleCapReached: z.boolean().default(false),
    reviewedCommit: z.string().optional(),
    includedReviewers: z.array(z.string()).optional(),
    excludedReviewers: z.record(z.string(), z.string()).optional(),
    preBlockedState: z.string().optional(),
    transcriptPath: z.string().optional(),
  })
}

const WORKFLOW_STATE_SCHEMA = createWorkflowStateSchema(WORKFLOW_STATE_NAMES)

type WorkflowStateValue = z.infer<typeof WORKFLOW_STATE_SCHEMA>

type WorkflowStateJson = {
  readonly currentStateMachineState: WorkflowStateNameValue
  readonly githubIssue?: number | undefined
  readonly featureBranch?: string | undefined
  readonly prNumber?: number | undefined
  readonly prUrl?: string | undefined
  readonly reviewerStatuses: Readonly<Record<string, string>>
  readonly reviewCycleNumber?: number | undefined
  readonly reviewCycleOpen?: boolean | undefined
  readonly reviewCycleCapReached?: boolean | undefined
  readonly reviewedCommit?: string | undefined
  readonly includedReviewers?: readonly string[] | undefined
  readonly excludedReviewers?: Readonly<Record<string, string>> | undefined
  readonly preBlockedState?: string | undefined
  readonly transcriptPath?: string | undefined
}

function applyReviewEvent(state: WorkflowState, event: WorkflowEvent): WorkflowState | undefined {
  if (event.type === 'reviewer-status-recorded')
    return applyReviewerStatus(state, event.reviewer, event.status)
  return undefined
}

function applyReviewerStatus(
  state: WorkflowState,
  reviewerName: string,
  statusName: string,
): WorkflowState {
  return state.with({
    reviewerStatuses: state.reviewerStatuses
      .withReviewer(Reviewer.fromName(reviewerName), ReviewerStatus.parse(statusName))
      .toJSON(),
  })
}

/** @riviere-role value-object */
export class WorkflowState {
  declare private readonly brand: 'WorkflowState'

  readonly currentStateMachineState: WorkflowStateNameValue
  readonly githubIssue?: number
  readonly featureBranch?: string
  readonly prNumber?: number
  readonly prUrl?: string
  readonly reviewerStatuses: ReviewerStatuses
  readonly reviewCycleNumber: number
  readonly reviewCycleOpen: boolean
  readonly reviewCycleCapReached: boolean
  readonly reviewedCommit?: string
  readonly includedReviewers: readonly string[]
  readonly excludedReviewers: Readonly<Record<string, string>>
  readonly preBlockedState?: string
  readonly transcriptPath?: string

  private constructor(value: WorkflowStateValue) {
    this.currentStateMachineState = value.currentStateMachineState
    this.reviewerStatuses = ReviewerStatuses.parse(value.reviewerStatuses)
    this.reviewCycleNumber = value.reviewCycleNumber ?? 0
    this.reviewCycleOpen = value.reviewCycleOpen ?? false
    this.reviewCycleCapReached = value.reviewCycleCapReached
    if (value.reviewedCommit !== undefined) this.reviewedCommit = value.reviewedCommit
    this.includedReviewers = value.includedReviewers ?? []
    this.excludedReviewers = value.excludedReviewers ?? {}
    if (value.githubIssue !== undefined) this.githubIssue = value.githubIssue
    if (value.featureBranch !== undefined) this.featureBranch = value.featureBranch
    if (value.prNumber !== undefined) this.prNumber = value.prNumber
    if (value.prUrl !== undefined) this.prUrl = value.prUrl
    if (value.preBlockedState !== undefined) this.preBlockedState = value.preBlockedState
    if (value.transcriptPath !== undefined) this.transcriptPath = value.transcriptPath
  }

  static parse(value: unknown): WorkflowState {
    if (value instanceof WorkflowState) return value
    return new WorkflowState(WORKFLOW_STATE_SCHEMA.parse(value))
  }

  static from(events: readonly WorkflowEvent[]): WorkflowState {
    return events.reduce((state, event) => state.apply(event), INITIAL_STATE)
  }

  currentStateName(): WorkflowStateName {
    return WorkflowStateName.fromName(this.currentStateMachineState)
  }

  toJSON(): WorkflowStateJson {
    return {
      currentStateMachineState: this.currentStateMachineState,
      reviewerStatuses: this.reviewerStatuses.toJSON(),
      reviewCycleNumber: this.reviewCycleNumber,
      reviewCycleOpen: this.reviewCycleOpen,
      reviewCycleCapReached: this.reviewCycleCapReached,
      ...(this.reviewedCommit === undefined ? {} : { reviewedCommit: this.reviewedCommit }),
      includedReviewers: [...this.includedReviewers],
      excludedReviewers: { ...this.excludedReviewers },
      ...(this.githubIssue === undefined ? {} : { githubIssue: this.githubIssue }),
      ...(this.featureBranch === undefined ? {} : { featureBranch: this.featureBranch }),
      ...(this.prNumber === undefined ? {} : { prNumber: this.prNumber }),
      ...(this.prUrl === undefined ? {} : { prUrl: this.prUrl }),
      ...(this.preBlockedState === undefined ? {} : { preBlockedState: this.preBlockedState }),
      ...(this.transcriptPath === undefined ? {} : { transcriptPath: this.transcriptPath }),
    }
  }

  with(changes: Partial<WorkflowStateJson>): WorkflowState {
    return WorkflowState.parse({
      ...this.toJSON(),
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
      case 'review-cycle-started':
        return this.with({
          reviewCycleNumber: event.cycleNumber,
          reviewCycleOpen: true,
          reviewCycleCapReached: false,
          includedReviewers: [...event.includedReviewers],
          excludedReviewers: { ...event.excludedReviewers },
        })
      case 'review-cycle-closed': {
        const withOutcomes = Object.entries(event.outcomes).reduce<WorkflowState>(
          (state, [reviewer, status]) => applyReviewerStatus(state, reviewer, status),
          this,
        )
        return withOutcomes.with({
          reviewCycleOpen: false,
          reviewedCommit: event.reviewedCommit,
        })
      }
      case 'session-started':
        return this.with({
          ...(event.transcriptPath !== undefined && { transcriptPath: event.transcriptPath }),
        })
      default:
        return this
    }
  }
}

function pendingReviewerStatus(): ReviewerStatus {
  return ReviewerStatus.parse('PENDING')
}

function initialReviewerStatuses(): ReviewerStatuses {
  return ReviewerStatuses.fromInitialState(Reviewers.singleton().all(), pendingReviewerStatus())
}

const INITIAL_STATE = WorkflowState.parse({
  currentStateMachineState: 'IMPLEMENTING',
  reviewerStatuses: initialReviewerStatuses().toJSON(),
})

/**
 * @riviere-role domain-service
 * @riviere-role-justification PLACEHOLDER: Added before justification rule introduced.
 */
export function getInitialWorkflowState(): WorkflowState {
  return INITIAL_STATE
}
