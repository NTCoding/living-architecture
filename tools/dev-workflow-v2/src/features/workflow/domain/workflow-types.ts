import { z } from 'zod'
import type {
  WorkflowStateDefinition,
  WorkflowRegistry,
} from '@nt-ai-lab/deterministic-agent-workflow-dsl'

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

/** @riviere-role value-object */
export type StateName = (typeof STATE_NAMES)[number]

export const STATE_NAME_SCHEMA = z.enum(STATE_NAMES)

const LIVING_ARCHITECTURE_REVIEW_TYPES = [
  'architecture-review',
  'code-review',
  'bug-scanner',
  'task-check',
] as const

export const LIVING_ARCHITECTURE_REVIEW_TYPE_SCHEMA = z.enum(LIVING_ARCHITECTURE_REVIEW_TYPES)

/** @riviere-role value-object */
export type LivingArchitectureReviewType = (typeof LIVING_ARCHITECTURE_REVIEW_TYPES)[number]

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

export const WORKFLOW_STATE_SCHEMA = createWorkflowStateSchema(STATE_NAMES)

/** @riviere-role value-object */
export type WorkflowState = {
  currentStateMachineState: StateName
  githubIssue?: number | undefined
  featureBranch?: string | undefined
  prNumber?: number | undefined
  prUrl?: string | undefined
  architectureReviewPassed: boolean
  codeReviewPassed: boolean
  bugScannerPassed: boolean
  taskCheckPassed: boolean
  ciPassed: boolean
  feedbackClean: boolean
  feedbackAddressed: boolean
  feedbackUnresolvedCount?: number | undefined
  prFeedbackVerificationFailedReason?: string | undefined
  preBlockedState?: string | undefined
  transcriptPath?: string | undefined
}

/** @riviere-role value-object */
export type WorkflowOperation =
  | 'record-issue'
  | 'record-branch'
  | 'record-review'
  | 'record-pr'
  | 'record-ci-passed'
  | 'record-ci-failed'
  | 'create-pr'
  | 'verify-feedback-addressed'

/** @riviere-role value-object */
export type ConcreteStateDefinition = WorkflowStateDefinition<
  WorkflowState,
  StateName,
  WorkflowOperation
> & { allowIdle?: boolean }

/** @riviere-role value-object */
export type ConcreteRegistry = WorkflowRegistry<WorkflowState, StateName, WorkflowOperation>

export const INITIAL_STATE: WorkflowState = {
  currentStateMachineState: 'IMPLEMENTING',
  architectureReviewPassed: false,
  codeReviewPassed: false,
  bugScannerPassed: false,
  taskCheckPassed: false,
  ciPassed: false,
  feedbackClean: false,
  feedbackAddressed: false,
}

/** @riviere-role domain-service */
export function parseStateName(value: string): StateName {
  return STATE_NAME_SCHEMA.parse(value)
}
