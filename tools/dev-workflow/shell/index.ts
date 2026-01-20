// Use cases
export { executeCompleteTask } from '../features/complete-task/use-cases/complete-task'
export { executeGetPRFeedback } from '../features/get-pr-feedback/use-cases/get-pr-feedback'
export {
  respondToFeedback,
  executeRespondToFeedback,
} from '../features/respond-to-feedback/use-cases/respond-to-feedback'
export {
  parseHookInput,
  routeToHandler,
  shouldSkipHooks,
} from '../features/claude-hooks/use-cases/handle-hook'

// Workflow execution
export { runWorkflow } from '../platform/domain/workflow-execution/run-workflow'
export {
  workflow, WorkflowError 
} from '../platform/domain/workflow-execution/workflow-runner'

// Zod schemas for runtime validation
export { completeTaskContextSchema } from '../features/complete-task/domain/task-to-complete'
export { getPRFeedbackContextSchema } from '../features/get-pr-feedback/domain/feedback-report'

// Error classes for error handling
export { MissingPullRequestDetailsError } from '../features/complete-task/domain/pull-request-draft'
export { AgentError } from '../features/complete-task/domain/steps/run-code-review'
export { ConventionalCommitTitle } from '../platform/domain/commit-format/conventional-commit-title'
export { ClaudeQueryError } from '../platform/infra/external-clients/claude-agent'
export { GitError } from '../platform/infra/external-clients/git-client'
export { GitHubError } from '../platform/infra/external-clients/github-rest-client'

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
export type { FormattedFeedbackItem } from '../platform/domain/review-feedback/get-pr-feedback'
export type { ReviewDecision } from '../platform/domain/review-feedback/review-decision'
