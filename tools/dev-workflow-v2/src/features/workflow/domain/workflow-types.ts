import { z } from 'zod'

export const STATE_NAMES = [
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

export const STATE_NAME_SCHEMA = z.enum(STATE_NAMES)

const LIVING_ARCHITECTURE_REVIEW_TYPES = [
  'architecture-review',
  'code-review',
  'bug-scanner',
  'task-check',
] as const

export const LIVING_ARCHITECTURE_REVIEW_TYPE_SCHEMA = z.enum(LIVING_ARCHITECTURE_REVIEW_TYPES)

/** @riviere-role domain-service */
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

  with(changes: Partial<z.infer<typeof WORKFLOW_STATE_SCHEMA>>): WorkflowState {
    return WorkflowState.parse({
      ...this,
      ...changes,
    })
  }
}

export const INITIAL_STATE = WorkflowState.parse({
  currentStateMachineState: 'IMPLEMENTING',
  architectureReviewPassed: false,
  codeReviewPassed: false,
  bugScannerPassed: false,
  taskCheckPassed: false,
  ciPassed: false,
  feedbackClean: false,
  feedbackAddressed: false,
})

/** @riviere-role domain-service */
export function parseStateName(value: string): StateName {
  return STATE_NAME_SCHEMA.parse(value)
}
