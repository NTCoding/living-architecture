import { readFile } from 'node:fs/promises'
import { z } from 'zod'
import type { Step } from '../../../../platform/domain/workflow-execution/workflow-runner'
import {
  success, failure 
} from '../../../../platform/domain/workflow-execution/step-result'
import { claude } from '../../../../platform/infra/external-clients/claude-agent'
import { git } from '../../../../platform/infra/external-clients/git-client'
import { cli } from '../../../../platform/infra/external-clients/cli-args'
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

const findingSchema = z.object({
  severity: z.enum(['critical', 'major', 'minor']),
  file: z.string(),
  line: z.number().nullish(),
  message: z.string(),
})

const agentResponseSchema = z.object({
  result: z.enum(['PASS', 'FAIL']),
  summary: z.string(),
  findings: z.array(findingSchema),
})

const reviewerResultSchema = agentResponseSchema.extend({
  name: z.string(),
  reportPath: z.string(),
})
type ReviewerResult = z.infer<typeof reviewerResultSchema>

const VALID_REVIEWERS = ['code-review', 'bug-scanner', 'task-check'] as const
type ReviewerName = (typeof VALID_REVIEWERS)[number]

function shouldSkipCodeReview(): boolean {
  return cli.hasFlag('--reject-review-feedback')
}

function getReviewerNames(hasIssue: boolean, reviewDir: string): readonly ReviewerName[] {
  const shouldRunTaskCheck = hasIssue && !taskCheckMarkerExists(reviewDir)
  return ['code-review', 'bug-scanner', ...(shouldRunTaskCheck ? (['task-check'] as const) : [])]
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

export const codeReview: Step<CompleteTaskContext> = {
  name: 'code-review',
  execute: async (ctx) => {
    if (shouldSkipCodeReview()) {
      return success()
    }

    if (!ctx.reviewDir) {
      return failure({
        type: 'fix_errors',
        details: 'Missing required context: reviewDir',
      })
    }

    const baseBranch = await git.baseBranch()
    const filesToReview = await git.diffFiles(baseBranch)

    const reviewerNames = getReviewerNames(ctx.hasIssue, ctx.reviewDir)

    const results = await executeCodeReviewAgents(
      reviewerNames,
      filesToReview,
      ctx.reviewDir,
      ctx.taskDetails,
    )

    const failures = results.filter((r) => r.result === 'FAIL')
    if (failures.length > 0) {
      return failure({
        type: 'fix_review',
        details: failures.map((f) => ({
          name: f.name,
          summary: f.summary,
          reportPath: f.reportPath,
        })),
      })
    }

    return success()
  },
}

async function executeCodeReviewAgents(
  names: readonly ReviewerName[],
  filesToReview: string[],
  reviewDir: string,
  taskDetails?: {
    title: string
    body: string
  },
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

      const agentPath = `.claude/agents/${name}.md`
      const basePrompt = await loadAgentInstructions(agentPath)
      const reportPath = `${reviewDir}/${name}.md`

      const promptParts = [basePrompt, '\n\n## Files to Review\n\n', filesToReview.join('\n')]

      if (name === 'task-check' && taskDetails) {
        promptParts.push(
          `\n\n## Task Details\n\nTitle: ${taskDetails.title}\n\nBody:\n${taskDetails.body}`,
        )
      }

      const response = await claude.query({
        prompt: promptParts.join(''),
        model: 'sonnet',
        outputSchema: agentResponseSchema,
        outputPath: reportPath,
        settingSources: ['project'],
      })

      if (name === 'task-check' && response.result === 'PASS') {
        await createTaskCheckMarker(reviewDir)
      }

      return {
        ...response,
        name,
        reportPath,
      }
    }),
  )
}
