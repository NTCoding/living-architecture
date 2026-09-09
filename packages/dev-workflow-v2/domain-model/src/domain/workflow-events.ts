import { z } from 'zod'
import type { BaseEvent } from '@nt-ai-lab/deterministic-agent-workflow-engine'
import { Reviewers } from './reviews/reviewers'
import { ReviewStatuses } from './reviews/statuses'
import { WorkflowState } from './workflow-types'

const STATE_NAME_SCHEMA = WorkflowState.stateNameSchema()
const KNOWN_WORKFLOW_EVENT_TYPES = [
  'session-started',
  'transitioned',
  'issue-recorded',
  'branch-recorded',
  'pr-recorded',
  'reviewer-status-recorded',
  'bash-checked',
  'write-checked',
] as const

const SESSION_STARTED_SCHEMA = z.object({
  type: z.literal('session-started'),
  at: z.string(),
  transcriptPath: z.string().optional(),
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

const PR_RECORDED_SCHEMA = z.object({
  type: z.literal('pr-recorded'),
  at: z.string(),
  prNumber: z.number(),
  prUrl: z.string().optional(),
})

const REVIEWER_STATUS_RECORDED_EVENT_SCHEMA = z.object({
  type: z.literal('reviewer-status-recorded'),
  at: z.string(),
  reviewer: Reviewers.schema(),
  status: ReviewStatuses.schema(),
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

const WORKFLOW_EVENT_SCHEMA = z.discriminatedUnion('type', [
  SESSION_STARTED_SCHEMA,
  TRANSITIONED_SCHEMA,
  ISSUE_RECORDED_SCHEMA,
  BRANCH_RECORDED_SCHEMA,
  PR_RECORDED_SCHEMA,
  REVIEWER_STATUS_RECORDED_EVENT_SCHEMA,
  BASH_CHECKED_SCHEMA,
  WRITE_CHECKED_SCHEMA,
])

/** @riviere-role domain-event */
export type WorkflowEvent = z.infer<typeof WORKFLOW_EVENT_SCHEMA>

/**
 * @riviere-role domain-service
 * @riviere-role-justification PLACEHOLDER: Added before justification rule introduced.
 */
export function parseWorkflowEvent(event: BaseEvent): WorkflowEvent {
  return WORKFLOW_EVENT_SCHEMA.parse(event)
}

/**
 * @riviere-role domain-service
 * @riviere-role-justification PLACEHOLDER: Added before justification rule introduced.
 */
export function getKnownWorkflowEventTypes(): readonly string[] {
  return [...KNOWN_WORKFLOW_EVENT_TYPES]
}
