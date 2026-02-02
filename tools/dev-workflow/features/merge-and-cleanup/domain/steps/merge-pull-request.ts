import type { Step } from '../../../../platform/domain/workflow-execution/workflow-runner'
import {
  success, failure 
} from '../../../../platform/domain/workflow-execution/step-result'
import type { MergeCleanupContext } from '../merge-cleanup-context'

interface MergePRDeps {mergePR: (prNumber: number) => Promise<void>}

export function createMergePullRequestStep(deps: MergePRDeps): Step<MergeCleanupContext> {
  return {
    name: 'merge-pull-request',
    async execute(ctx) {
      try {
        await deps.mergePR(ctx.prNumber)
        return success()
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error)
        return failure({
          nextAction: 'fix_merge',
          nextInstructions: `Failed to merge PR #${ctx.prNumber}: ${message}`,
        })
      }
    },
  }
}
