import { readFile } from 'node:fs/promises'
import { z } from 'zod'
import type { Step } from '../../workflow-runner/workflow-runner'
import {
  success, failure 
} from '../../workflow-runner/workflow-runner'
import { claude } from '../../external-clients/claude'
import { git } from '../../external-clients/git'
import { cli } from '../../external-clients/cli'
import { AgentError } from '../../errors'
import type { CompleteTaskContext } from '../complete-task'

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

function shouldSkipCodeReview(): boolean {
  return cli.hasFlag('--reject-review-feedback')
}

function getReviewerNames(hasIssue: boolean): readonly string[] {
  return ['code-review', 'bug-scanner', ...(hasIssue ? ['task-check'] : [])]
}

async function loadAgentInstructions(agentPath: string): Promise<string> {
  try {
    return await readFile(agentPath, 'utf-8')
  } catch (error) {
    throw new AgentError(
      `Failed to read agent prompt at ${agentPath}: ${error instanceof Error ? error.message : String(error)}`,
    )
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

    const reviewerNames = getReviewerNames(ctx.hasIssue)

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
  names: readonly string[],
  filesToReview: string[],
  reviewDir: string,
  taskDetails?: {
    title: string
    body: string
  },
): Promise<ReviewerResult[]> {
  const validReviewers = new Set(['code-review', 'bug-scanner', 'task-check'])

  return Promise.all(
    names.map(async (name) => {
      if (!validReviewers.has(name)) {
        throw new AgentError(
          `Invalid reviewer name: ${name}. Must be one of: ${Array.from(validReviewers).join(', ')}`,
        )
      }

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

      return {
        ...response,
        name,
        reportPath,
      }
    }),
  )
}
