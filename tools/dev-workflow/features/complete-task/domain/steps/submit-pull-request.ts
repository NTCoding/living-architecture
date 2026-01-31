import type { Step } from '../../../../platform/domain/workflow-execution/workflow-runner'
import {
  success, failure 
} from '../../../../platform/domain/workflow-execution/step-result'
import { WorkflowError } from '../../../../platform/domain/workflow-execution/workflow-runner'
import type { CompleteTaskContext } from '../task-to-complete'

interface PRInfo {
  number: number
  url: string
}

interface CreatePROptions {
  title: string
  body: string
  branch: string
  base: string
}

interface CIResult {
  failed: boolean
  output: string
}

export interface SubmitPRDeps {
  uncommittedFiles: () => Promise<string[]>
  push: () => Promise<void>
  baseBranch: () => Promise<string>
  getPR: (prNumber: number) => Promise<PRInfo>
  createPR: (opts: CreatePROptions) => Promise<PRInfo>
  watchCI: (prNumber: number) => CIResult | Promise<CIResult>
}

async function resolvePR(
  ctx: CompleteTaskContext,
  deps: SubmitPRDeps,
  baseBranch: string,
): Promise<PRInfo> {
  if (ctx.prMode === 'update' && ctx.prNumber) {
    return deps.getPR(ctx.prNumber)
  }
  if (!ctx.prTitle || !ctx.prBody) {
    throw new WorkflowError('PR title and body are required in create mode')
  }
  return deps.createPR({
    title: ctx.prTitle,
    body: ctx.prBody,
    branch: ctx.branch,
    base: baseBranch,
  })
}

export function createSubmitPRStep(deps: SubmitPRDeps): Step<CompleteTaskContext> {
  return {
    name: 'submit-pr',
    execute: async (ctx) => {
      const uncommitted = await deps.uncommittedFiles()
      if (uncommitted.length > 0) {
        throw new WorkflowError(
          `Uncommitted changes detected:\n${uncommitted.join('\n')}\n\n` +
            'Commit all changes before running /complete-task.',
        )
      }
      await deps.push()

      const baseBranchName = await deps.baseBranch()

      const pr = await resolvePR(ctx, deps, baseBranchName)

      ctx.prUrl = pr.url
      ctx.prNumber = pr.number

      const ciResult = await deps.watchCI(pr.number)

      if (ciResult.failed) {
        return failure({
          type: 'fix_errors',
          details: ciResult.output,
        })
      }

      return success()
    },
  }
}
