/**
 * Shell: Public API for dev-workflow tools
 *
 * This module exports the use cases and types for each feature.
 * CLI entry points are separate files that import from this module.
 */

// Use cases
export { buildCompleteTaskContext } from '../features/complete-task/use-cases/complete-task'
export { buildGetPRFeedbackContext } from '../features/get-pr-feedback/use-cases/get-pr-feedback'
export { respondToFeedback } from '../features/respond-to-feedback/use-cases/respond-to-feedback'
export { routeToHandler } from '../features/claude-hooks/use-cases/handle-hook'

// Workflow execution
export { runWorkflow } from '../platform/domain/workflow-execution/run-workflow'
export { workflow } from '../platform/domain/workflow-execution/workflow-runner'

// Types for external consumers
export type { CompleteTaskContext } from '../features/complete-task/domain/task-to-complete'
export type { CompleteTaskResult } from '../features/complete-task/domain/pipeline-outcome'
export type { GetPRFeedbackContext } from '../features/get-pr-feedback/domain/feedback-report'
export type { PRFeedbackStatus } from '../features/get-pr-feedback/domain/feedback-report'
export type {
  RespondToFeedbackInput,
  RespondToFeedbackOutput,
} from '../features/respond-to-feedback/domain/feedback-response'
export type { HookInput } from '../features/claude-hooks/domain/hook-input-schemas'
export type { HookOutput } from '../features/claude-hooks/domain/hook-output-schemas'
