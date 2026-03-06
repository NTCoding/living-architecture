import { z } from 'zod'
import type {
  WorkflowStateDefinition,
  WorkflowRegistry,
} from '@ntcoding/agentic-workflow-builder/dsl'

export const STATE_NAMES = [
  'IMPLEMENTING',
  'VERIFYING',
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
    verifyPassed: z.boolean(),
    reviewPassed: z.boolean(),
    taskCheckPassed: z.boolean(),
    ciPassed: z.boolean(),
    feedbackClean: z.boolean(),
    feedbackAddressed: z.boolean(),
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
  verifyPassed: boolean
  reviewPassed: boolean
  taskCheckPassed: boolean
  ciPassed: boolean
  feedbackClean: boolean
  feedbackAddressed: boolean
  reflectionPath?: string | undefined
  preBlockedState?: string | undefined
}

export type WorkflowOperation =
  | 'record-issue'
  | 'record-branch'
  | 'record-verify-passed'
  | 'record-verify-failed'
  | 'record-review-passed'
  | 'record-review-failed'
  | 'record-task-check-passed'
  | 'record-pr'
  | 'record-ci-passed'
  | 'record-ci-failed'
  | 'record-feedback-clean'
  | 'record-feedback-exists'
  | 'record-feedback-addressed'
  | 'record-reflection'

type ForbiddenBashCommand = 'git push' | 'gh pr'

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
  verifyPassed: false,
  reviewPassed: false,
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
  VERIFYING: '🔍',
  REVIEWING: '📋',
  SUBMITTING_PR: '🚀',
  AWAITING_CI: '⏳',
  CHECKING_FEEDBACK: '💬',
  ADDRESSING_FEEDBACK: '🔧',
  REFLECTING: '🪞',
  COMPLETE: '✅',
  BLOCKED: '⚠️',
}
