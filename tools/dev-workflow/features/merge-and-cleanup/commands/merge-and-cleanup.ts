/* v8 ignore start -- command wiring, domain logic tested via step specs */
import { git } from '../../../platform/infra/external-clients/git-client'
import { github } from '../../../platform/infra/external-clients/github-rest-client'
import { runWorkflow } from '../../../platform/domain/workflow-execution/run-workflow'
import { WorkflowError } from '../../../platform/domain/workflow-execution/workflow-runner'
import { mergeCleanupContextSchema } from '../domain/merge-cleanup-context'
import type { MergeCleanupContext } from '../domain/merge-cleanup-context'
import { createVerifyReflectionExistsStep } from '../domain/steps/verify-reflection-exists'
import { createMergePullRequestStep } from '../domain/steps/merge-pull-request'
import { createRemoveWorktreeStep } from '../domain/steps/remove-worktree'
import {
  resolveWorktreeInfo,
  removeWorktreePermission,
  removeWorktree,
} from '../domain/worktree-operations'
import { buildReflectionFilePath } from '../domain/reflection-path'

async function buildMergeCleanupContext(): Promise<MergeCleanupContext> {
  const branch = await git.currentBranch()
  const {
    worktreePath, mainRepoPath 
  } = resolveWorktreeInfo()

  const today = new Date().toISOString().slice(0, 10)
  const reflectionFilePath = buildReflectionFilePath(branch, today)

  const prNumber = await github.findPRForBranch(branch)
  if (prNumber === undefined) {
    throw new WorkflowError(`No open PR found for branch '${branch}'.`)
  }

  return mergeCleanupContextSchema.parse({
    branch,
    reflectionFilePath,
    prNumber,
    worktreePath,
    mainRepoPath,
  })
}

function buildSteps() {
  return [
    createVerifyReflectionExistsStep(),
    createMergePullRequestStep({ mergePR: github.mergePR.bind(github) }),
    createRemoveWorktreeStep({
      uncommittedFiles: git.uncommittedFiles.bind(git),
      removeWorktreePermission,
      removeWorktree,
    }),
  ]
}

export function executeMergeAndCleanup(): void {
  runWorkflow<MergeCleanupContext>(buildSteps(), buildMergeCleanupContext)
}
/* v8 ignore stop */
