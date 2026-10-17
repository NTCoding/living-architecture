import { z } from 'npm:zod@4.3.6'

/**
 * Argument and resource schemas for the maintainer git behaviour.
 *
 * Every value that reaches a git or gh command is declared here first, so a
 * malformed branch name, commit message or pull request body is rejected on the
 * way in rather than reaching the repository.
 */

const SEVERITIES = ['critical', 'high', 'medium', 'low'] as const

/** Where a method is running, and the only things a method may do with it. */
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

/** What a method returns so Swamp can record which data it produced. */
export interface MethodResult {
  readonly dataHandles: unknown[]
}

/** Arguments for reading and preparing an issue. */
export const ISSUE_ARGUMENTS = z.object({
  issue: z.number().int().positive(),
})

/** Arguments for committing. */
export const COMMIT_ARGUMENTS = z.object({
  message: z.string().min(1).max(72),
})

/** Arguments for a method that takes none. */
export const EMPTY_ARGUMENTS = z.object({})

/** Arguments for pushing a branch. */
export const PUSH_ARGUMENTS = z.object({
  branch: z.string().min(1),
})

/** Arguments for opening the pull request. */
export const OPEN_PULL_REQUEST_ARGUMENTS = z.object({
  issue: z.number().int().positive(),
  branch: z.string().min(1),
  title: z.string().min(1).max(100),
  planSummary: z.string().min(1),
  changeSummary: z.string().min(1),
  commitMessage: z.string().min(1).max(72),
  files: z.array(z.string().min(1)).min(1),
})

/** Arguments for posting a comment. */
export const COMMENT_ARGUMENTS = z.object({
  pr: z.number().int().positive(),
  body: z.string().min(1),
})

/** Arguments for posting every recorded finding. */
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

/** Arguments for waiting on the external reviewer. */
export const AWAIT_REVIEWER_ARGUMENTS = z.object({
  pr: z.number().int().positive(),
  headSha: z.string().min(1),
  timeoutSeconds: z.number().int().positive().default(1800),
  intervalSeconds: z.number().int().positive().default(30),
})

/** The branch a work item runs on. */
export const WORKSPACE_RESOURCE = z.object({
  branch: z.string(),
  base: z.string(),
  issue: z.number(),
  created: z.boolean(),
})

/** The commit that was made, and the tree state after it. */
export const COMMIT_RESOURCE = z.object({
  sha: z.string(),
  subject: z.string(),
  clean: z.boolean(),
  commitsAhead: z.number(),
})

/** The result of the repository verify gate. */
export const CHECKS_RESOURCE = z.object({
  passed: z.boolean(),
  exitCode: z.number(),
  summary: z.string(),
})

/** A branch that was pushed. */
export const PUSH_RESOURCE = z.object({
  branch: z.string(),
  pushed: z.boolean(),
})

/** The pull request a work item produced. */
export const PULL_REQUEST_RESOURCE = z.object({
  number: z.number(),
  url: z.string(),
  headSha: z.string(),
})

/** The external reviewer's verdict on a commit. */
export const REVIEWER_RESOURCE = z.object({
  reviewedSha: z.string(),
  state: z.string(),
  reviewed: z.boolean(),
})

/** The findings posted to a pull request, split by how they were posted. */
export const POSTED_FINDINGS_RESOURCE = z.object({
  inline: z.number(),
  general: z.number(),
  findingIds: z.array(z.string()),
})
