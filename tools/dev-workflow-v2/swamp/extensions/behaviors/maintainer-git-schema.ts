import { z } from 'npm:zod@4.3.6'

const SEVERITIES = ['critical', 'high', 'medium', 'low'] as const

export interface BehaviourContext {
  readonly repoDir: string
  readonly logger: {
    info(message: string): void
    warn(message: string): void
  }
  readonly signal: AbortSignal
  writeResource(
    specName: string,
    instanceName: string,
    payload: Record<string, unknown>,
    options?: { tags?: Record<string, string> },
  ): Promise<unknown>
}

export interface MethodResult {
  readonly dataHandles: unknown[]
}

export const ISSUE_ARGUMENTS = z.object({
  issue: z.string().min(1),
})

export const COMMIT_ARGUMENTS = z.object({
  message: z.string().min(1).max(72),
})

export const EMPTY_ARGUMENTS = z.object({})

export const PUSH_ARGUMENTS = z.object({
  branch: z.string().min(1),
})

export const OPEN_PULL_REQUEST_ARGUMENTS = z.object({
  issue: z.number().int().positive(),
  branch: z.string().min(1),
  title: z.string().min(1).max(100),
  changeSummary: z.string().min(1),
  commitMessage: z.string().min(1).max(72),
  files: z.array(z.string().min(1)).min(1),
})

export const COMMENT_ARGUMENTS = z.object({
  pr: z.number().int().positive(),
  body: z.string().min(1),
})

export const POST_FINDINGS_ARGUMENTS = z.object({
  pr: z.number().int().positive(),
  headSha: z.string().min(1),
  findings: z.array(
    z.object({
      id: z.string().min(1),
      severity: z.enum(SEVERITIES),
      description: z.string().min(1),
      category: z.string().min(1).optional(),
    }),
  ),
  locations: z.array(
    z.object({
      findingId: z.string().min(1),
      path: z.string().min(1),
      line: z.number().int().positive(),
    }),
  ),
})

export const AWAIT_REVIEWER_ARGUMENTS = z.object({
  pr: z.number().int().positive(),
  headSha: z.string().min(1),
  timeoutSeconds: z.number().int().positive().default(1800),
  intervalSeconds: z.number().int().positive().default(30),
})

export const WORKSPACE_RESOURCE = z.object({
  branch: z.string(),
  base: z.string(),
  issue: z.number(),
  created: z.boolean(),
})

export const COMMIT_RESOURCE = z.object({
  sha: z.string(),
  subject: z.string(),
  clean: z.boolean(),
  commitsAhead: z.number(),
})

export const CHECKS_RESOURCE = z.object({
  passed: z.boolean(),
  exitCode: z.number(),
  summary: z.string(),
})

export const PUSH_RESOURCE = z.object({
  branch: z.string(),
  pushed: z.boolean(),
})

export const PULL_REQUEST_RESOURCE = z.object({
  number: z.number(),
  url: z.string(),
  headSha: z.string(),
})

export const REVIEWER_RESOURCE = z.object({
  reviewedSha: z.string(),
  state: z.string(),
  reviewed: z.boolean(),
})

export const POSTED_FINDINGS_RESOURCE = z.object({
  inline: z.number(),
  general: z.number(),
  findingIds: z.array(z.string()),
})
