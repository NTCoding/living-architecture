import { z } from 'zod'

const SESSION_STARTED_SCHEMA = z.object({
  type: z.literal('session-started'),
  at: z.string(),
  repository: z.string().optional(),
})

const TRANSITIONED_SCHEMA = z.object({
  type: z.literal('transitioned'),
  at: z.string(),
  from: z.string(),
  to: z.string(),
  preBlockedState: z.string().optional(),
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

const VERIFY_COMPLETED_SCHEMA = z.object({
  type: z.literal('verify-completed'),
  at: z.string(),
  passed: z.boolean(),
  output: z.string().optional(),
})

const REVIEW_COMPLETED_SCHEMA = z.object({
  type: z.literal('review-completed'),
  at: z.string(),
  passed: z.boolean(),
  failedReviewers: z.array(z.string()).optional(),
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
  VERIFY_COMPLETED_SCHEMA,
  REVIEW_COMPLETED_SCHEMA,
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
