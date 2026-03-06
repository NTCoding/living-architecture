import { z } from 'zod'
import type {
  WorkflowStateDefinition,
  WorkflowRegistry,
} from '@ntcoding/agentic-workflow-builder/dsl'

export const STATE_NAMES = [
  'IMPLEMENTING',
  'REVIEWING',
  'SUBMITTING_PR',
  'AWAITING_CI',
  'CHECKING_FEEDBACK',
  'ADDRESSING_FEEDBACK',
  'REFLECTING',
  'COMPLETE',
  'BLOCKED',
] as const

export type StateName = (typeof STATE_NAMES)[number]

export const STATE_NAME_SCHEMA = z.enum(STATE_NAMES)

export function createWorkflowStateSchema(stateNames: readonly [string, ...string[]]) {
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
    feedbackAddressedCount: z.number().optional(),
    reflectionPath: z.string().optional(),
    preBlockedState: z.string().optional(),
  })
}

export const WORKFLOW_STATE_SCHEMA = createWorkflowStateSchema(STATE_NAMES)

export type WorkflowState = {
  currentStateMachineState: string
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
  feedbackAddressedCount?: number | undefined
  reflectionPath?: string | undefined
  preBlockedState?: string | undefined
}

export type WorkflowOperation =
  | 'record-issue'
  | 'record-branch'
  | 'record-architecture-review-passed'
  | 'record-architecture-review-failed'
  | 'record-code-review-passed'
  | 'record-code-review-failed'
  | 'record-bug-scanner-passed'
  | 'record-bug-scanner-failed'
  | 'record-task-check-passed'
  | 'record-pr'
  | 'record-ci-passed'
  | 'record-ci-failed'
  | 'record-feedback-clean'
  | 'record-feedback-exists'
  | 'record-feedback-addressed'
  | 'record-reflection'

type ForbiddenBashCommand = 'git push' | 'gh pr' | 'gh pr checks' | 'gh pr view'

export type ConcreteStateDefinition = WorkflowStateDefinition<
  WorkflowState,
  StateName,
  WorkflowOperation,
  ForbiddenBashCommand
>

export type ConcreteRegistry = WorkflowRegistry<
  WorkflowState,
  StateName,
  WorkflowOperation,
  ForbiddenBashCommand
>

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

export function parseStateName(value: string): StateName {
  return STATE_NAME_SCHEMA.parse(value)
}

export const STATE_EMOJI_MAP: Readonly<Record<StateName, string>> = {
  IMPLEMENTING: '🔨',
  REVIEWING: '📋',
  SUBMITTING_PR: '🚀',
  AWAITING_CI: '⏳',
  CHECKING_FEEDBACK: '💬',
  ADDRESSING_FEEDBACK: '🔧',
  REFLECTING: '🪞',
  COMPLETE: '✅',
  BLOCKED: '⚠️',
}
