import { readFile } from 'node:fs/promises'
import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { z } from 'zod'
import type { Step } from '../../../../platform/domain/workflow-execution/workflow-runner'
import {
  success, failure 
} from '../../../../platform/domain/workflow-execution/step-result'
import {
  type DebugLog, noopDebugLog 
} from '../../../../platform/domain/debug-log'
import type { CompleteTaskContext } from '../task-to-complete'
import {
  taskCheckMarkerExists, createTaskCheckMarker 
} from '../task-check-marker'

export class AgentError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AgentError'
    Error.captureStackTrace?.(this, this.constructor)
  }
}

const VALID_VERDICTS = ['PASS', 'FAIL'] as const
const verdictSchema = z.enum(VALID_VERDICTS)
type Verdict = z.infer<typeof verdictSchema>

const reviewerResponseSchema = z.object({ verdict: z.enum(['PASS', 'FAIL']) })

export type ReviewerResponse = z.infer<typeof reviewerResponseSchema>

interface ReviewerResult {
  result: Verdict
  name: string
  reportPath: string
}

const VALID_REVIEWERS = ['architecture-review', 'code-review', 'bug-scanner', 'task-check'] as const
type ReviewerName = (typeof VALID_REVIEWERS)[number]

export interface CodeReviewDeps {
  skipReview: boolean
  baseBranch: () => Promise<string>
  unpushedFiles: (baseBranch: string) => Promise<string[]>
  queryAgent: <T>(opts: {
    prompt: string
    model: 'opus' | 'sonnet' | 'haiku'
    outputSchema: z.ZodSchema<T>
    settingSources?: ('user' | 'project' | 'local')[]
  }) => Promise<T>
  debugLog?: DebugLog
}

function getReviewerNames(hasIssue: boolean, reviewDir: string): readonly ReviewerName[] {
  const shouldRunTaskCheck = hasIssue && !taskCheckMarkerExists(reviewDir)
  return [
    'architecture-review',
    'code-review',
    'bug-scanner',
    ...(shouldRunTaskCheck ? (['task-check'] as const) : []),
  ]
}

async function loadAgentInstructions(agentPath: string): Promise<string> {
  try {
    return await readFile(agentPath, 'utf-8')
  } catch (error) {
    /* v8 ignore start - Node.js fs errors are always Error instances */
    throw new AgentError(
      `Failed to read agent prompt at ${agentPath}: ${error instanceof Error ? error.message : String(error)}`,
    )
    /* v8 ignore stop */
  }
}

export function createCodeReviewStep(deps: CodeReviewDeps): Step<CompleteTaskContext> {
  return {
    name: 'code-review',
    execute: async (ctx) => {
      const log = deps.debugLog ?? noopDebugLog()

      if (deps.skipReview) {
        log.log('code-review: skipped (--reject-review-feedback)')
        return success()
      }

      if (!ctx.reviewDir) {
        return failure({
          type: 'fix_errors',
          details: 'Missing required context: reviewDir',
        })
      }

      log.log('code-review: resolving baseBranch')
      const baseBranch = await deps.baseBranch()
      log.log(`code-review: baseBranch=${baseBranch}`)

      log.log('code-review: resolving unpushedFiles')
      const filesToReview = await deps.unpushedFiles(baseBranch)
      log.log(`code-review: ${filesToReview.length} files to review`)

      const reviewerNames = getReviewerNames(ctx.hasIssue, ctx.reviewDir)
      log.log(`code-review: reviewers=[${reviewerNames.join(', ')}]`)

      const resultsOrFailure = await executeCodeReviewAgents(
        deps,
        reviewerNames,
        filesToReview,
        ctx.reviewDir,
        ctx.taskDetails,
        log,
      ).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error)
        log.log(`code-review: agent execution error: ${message}`)
        return failure({
          type: 'fix_errors',
          details: `Code review agent failed: ${message}. Re-run /complete-task to retry.`,
        })
      })

      if (!Array.isArray(resultsOrFailure)) {
        return resultsOrFailure
      }

      const failures = resultsOrFailure.filter((r) => r.result === 'FAIL')
      if (failures.length > 0) {
        log.log(
          `code-review: ${failures.length} reviewers FAILED: ${failures.map((f) => f.name).join(', ')}`,
        )
        return failure({
          type: 'fix_review',
          details: failures.map((f) => ({
            name: f.name,
            reportPath: f.reportPath,
          })),
        })
      }

      log.log('code-review: all reviewers PASSED')
      return success()
    },
  }
}

function nextRoundNumber(reviewDir: string, name: string): number {
  try {
    const prefix = `${name}-`
    const suffix = '.md'
    const files = readdirSync(reviewDir)
    const rounds = files
      .filter((f) => f.startsWith(prefix) && f.endsWith(suffix))
      .map((f) => parseInt(f.slice(prefix.length, -suffix.length), 10))
      .filter((n) => !Number.isNaN(n))
    return rounds.length > 0 ? Math.max(...rounds) + 1 : 1
  } catch {
    return 1
  }
}

async function executeCodeReviewAgents(
  deps: CodeReviewDeps,
  names: readonly ReviewerName[],
  filesToReview: string[],
  reviewDir: string,
  taskDetails:
    | {
      title: string
      body: string
    }
    | undefined,
  log: DebugLog,
): Promise<ReviewerResult[]> {
  const validReviewerSet = new Set<string>(VALID_REVIEWERS)

  return Promise.all(
    names.map(async (name) => {
      /* v8 ignore start - defensive check, names from const array are always valid */
      if (!validReviewerSet.has(name)) {
        throw new AgentError(
          `Invalid reviewer name: ${name}. Must be one of: ${VALID_REVIEWERS.join(', ')}`,
        )
      }
      /* v8 ignore stop */

      log.log(`agent [${name}]: loading instructions`)
      const agentPath = `.claude/agents/${name}.md`
      const basePrompt = await loadAgentInstructions(agentPath)
      const round = nextRoundNumber(reviewDir, name)
      const reportPath = resolve(`${reviewDir}/${name}-${round}.md`)

      const promptParts = [
        basePrompt,
        `\n\n## Report Path\n\n${reportPath}`,
        '\n\n## Files to Review\n\n',
        filesToReview.join('\n'),
      ]

      if (name === 'task-check' && taskDetails) {
        promptParts.push(
          `\n\n## Task Details\n\nTitle: ${taskDetails.title}\n\nBody:\n${taskDetails.body}`,
        )
      }

      log.log(`agent [${name}]: calling claude SDK (model=opus, round=${round})`)
      const response = await deps.queryAgent<ReviewerResponse>({
        prompt: promptParts.join(''),
        model: 'opus',
        outputSchema: reviewerResponseSchema,
        settingSources: ['project'],
      })
      log.log(`agent [${name}]: verdict=${response.verdict}`)

      if (name === 'task-check' && response.verdict === 'PASS') {
        await createTaskCheckMarker(reviewDir)
      }

      return {
        result: response.verdict,
        name,
        reportPath,
      }
    }),
  )
}
