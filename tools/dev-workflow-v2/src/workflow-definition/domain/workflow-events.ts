import { z } from 'zod'
import { STATE_NAME_SCHEMA } from './workflow-types'

const SESSION_STARTED_SCHEMA = z.object({
  type: z.literal('session-started'),
  at: z.string(),
  repository: z.string().optional(),
})

const TRANSITIONED_SCHEMA = z.object({
  type: z.literal('transitioned'),
  at: z.string(),
  from: STATE_NAME_SCHEMA,
  to: STATE_NAME_SCHEMA,
  preBlockedState: z.string().optional(),
  stateOverrides: z.record(z.unknown()).optional(),
})

const ISSUE_RECORDED_SCHEMA = z.object({
  type: z.literal('issue-recorded'),
  at: z.string(),
  issueNumber: z.number(),
})

const BRANCH_RECORDED_SCHEMA = z.object({
  type: z.literal('branch-recorded'),
  at: z.string(),
  branch: z.string(),
})

const ARCHITECTURE_REVIEW_COMPLETED_SCHEMA = z.object({
  type: z.literal('architecture-review-completed'),
  at: z.string(),
  passed: z.boolean(),
})

const CODE_REVIEW_COMPLETED_SCHEMA = z.object({
  type: z.literal('code-review-completed'),
  at: z.string(),
  passed: z.boolean(),
})

const BUG_SCANNER_COMPLETED_SCHEMA = z.object({
  type: z.literal('bug-scanner-completed'),
  at: z.string(),
  passed: z.boolean(),
})

const PR_RECORDED_SCHEMA = z.object({
  type: z.literal('pr-recorded'),
  at: z.string(),
  prNumber: z.number(),
  prUrl: z.string().optional(),
})

const CI_COMPLETED_SCHEMA = z.object({
  type: z.literal('ci-completed'),
  at: z.string(),
  passed: z.boolean(),
  output: z.string().optional(),
})

const FEEDBACK_CHECKED_SCHEMA = z.object({
  type: z.literal('feedback-checked'),
  at: z.string(),
  clean: z.boolean(),
  unresolvedCount: z.number().optional(),
})

const FEEDBACK_ADDRESSED_SCHEMA = z.object({
  type: z.literal('feedback-addressed'),
  at: z.string(),
  addressedCount: z.number(),
})

const REFLECTION_WRITTEN_SCHEMA = z.object({
  type: z.literal('reflection-written'),
  at: z.string(),
  path: z.string(),
})

const TASK_CHECK_PASSED_SCHEMA = z.object({
  type: z.literal('task-check-passed'),
  at: z.string(),
})

const BASH_CHECKED_SCHEMA = z.object({
  type: z.literal('bash-checked'),
  at: z.string(),
  tool: z.string(),
  command: z.string(),
  allowed: z.boolean(),
  reason: z.string().optional(),
})

const WRITE_CHECKED_SCHEMA = z.object({
  type: z.literal('write-checked'),
  at: z.string(),
  tool: z.string(),
  filePath: z.string(),
  allowed: z.boolean(),
  reason: z.string().optional(),
})

export const WORKFLOW_EVENT_SCHEMA = z.discriminatedUnion('type', [
  SESSION_STARTED_SCHEMA,
  TRANSITIONED_SCHEMA,
  ISSUE_RECORDED_SCHEMA,
  BRANCH_RECORDED_SCHEMA,
  ARCHITECTURE_REVIEW_COMPLETED_SCHEMA,
  CODE_REVIEW_COMPLETED_SCHEMA,
  BUG_SCANNER_COMPLETED_SCHEMA,
  PR_RECORDED_SCHEMA,
  CI_COMPLETED_SCHEMA,
  FEEDBACK_CHECKED_SCHEMA,
  FEEDBACK_ADDRESSED_SCHEMA,
  REFLECTION_WRITTEN_SCHEMA,
  TASK_CHECK_PASSED_SCHEMA,
  BASH_CHECKED_SCHEMA,
  WRITE_CHECKED_SCHEMA,
])

export type WorkflowEvent = z.infer<typeof WORKFLOW_EVENT_SCHEMA>
