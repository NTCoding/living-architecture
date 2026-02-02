import type { Step } from '../../../../platform/domain/workflow-execution/workflow-runner'
import {
  success, failure 
} from '../../../../platform/domain/workflow-execution/step-result'
import type { MergeCleanupContext } from '../merge-cleanup-context'

interface RemoveWorktreeDeps {
  uncommittedFiles: () => Promise<string[]>
  removeWorktreePermission: (worktreePath: string, settingsPath: string) => void | Promise<void>
  removeWorktree: (worktreePath: string) => Promise<void>
}

export function createRemoveWorktreeStep(deps: RemoveWorktreeDeps): Step<MergeCleanupContext> {
  return {
    name: 'remove-worktree',
    async execute(ctx) {
      const uncommitted = await deps.uncommittedFiles()
      if (uncommitted.length > 0) {
        return failure({
          nextAction: 'fix_uncommitted',
          nextInstructions:
            `Uncommitted changes detected. Commit or stash changes first.\n` +
            `Files: ${uncommitted.join(', ')}`,
        })
      }

      const settingsPath = `${ctx.mainRepoPath}/.claude/settings.local.json`
      await deps.removeWorktreePermission(ctx.worktreePath, settingsPath)
      await deps.removeWorktree(ctx.worktreePath)

      return success({
        message: `Worktree removed: ${ctx.worktreePath}`,
        mainRepoPath: ctx.mainRepoPath,
      })
    },
  }
}
