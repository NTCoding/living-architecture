import { readFile } from 'node:fs/promises'
import type { Step } from '../../workflow-runner/workflow-runner'
import {
  success, failure 
} from '../../workflow-runner/workflow-runner'
import { claude } from '../../external-clients/claude'
import { git } from '../../external-clients/git'
import { cli } from '../../external-clients/cli'
import {
  agentResponseSchema, type ReviewerResult 
} from '../../workflow-runner/schemas'
import { AgentError } from '../../errors'
import type { CompleteTaskContext } from '../complete-task'

function shouldSkipCodeReview(): boolean {
  return cli.hasFlag('--reject-review-feedback')
}

async function readAgentPrompt(agentPath: string): Promise<string> {
  try {
    return await readFile(agentPath, 'utf-8')
  } catch (error) {
    throw new AgentError(
      `Failed to read agent prompt at ${agentPath}: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

export const codeReview: Step<CompleteTaskContext> = async (ctx) => {
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

  const reviewerNames = ['code-review', 'bug-scanner', ...(ctx.hasIssue ? ['task-check'] : [])]

  const results = await runReviewers(reviewerNames, filesToReview, ctx.reviewDir, ctx.taskDetails)

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
}

async function runReviewers(
  names: readonly string[],
  filesToReview: string[],
  reviewDir: string,
  taskDetails?: {
    title: string
    body: string
  },
): Promise<ReviewerResult[]> {
  return Promise.all(
    names.map(async (name) => {
      const agentPath = `.claude/agents/${name}.md`
      const basePrompt = await readAgentPrompt(agentPath)
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
      })

      return {
        ...response,
        name,
        reportPath,
      }
    }),
  )
}
