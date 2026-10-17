import type { PrepareWorktree } from '@living-architecture/dev-workflow-v3-domain-model/domain/ports/prepare-worktree'
import type {
  CommandOutput,
  CommandRequest,
} from '../../../../infra/external-clients/process/run-command'
import { gitOutput, toGitCommand } from '../../../../infra/external-clients/git/git'

type Dependencies = {
  readonly runCommand: (request: CommandRequest) => Promise<CommandOutput>
  readonly repositoryPath: string
  readonly worktreesDirectory: string
}

/**
 * Creates the branch and the worktree the agent will work in. A retry reuses
 * what is already there, so the run can carry on from the earlier attempt.
 * @riviere-role domain-port-adapter
 */
export function prepareWorktreeWithGit(dependencies: Dependencies): PrepareWorktree {
  return async (request) => {
    const worktreePath = `${dependencies.worktreesDirectory}/${request.branch}`
    if (await exists(dependencies, worktreePath)) return
    const base = await defaultBranch(dependencies)
    if (await branchExists(dependencies, request.branch)) {
      await gitOutput(dependencies.runCommand, {
        worktreePath: dependencies.repositoryPath,
        arguments: ['worktree', 'add', worktreePath, request.branch],
      })
      return
    }
    await gitOutput(dependencies.runCommand, {
      worktreePath: dependencies.repositoryPath,
      arguments: ['worktree', 'add', '-b', request.branch, worktreePath, base],
    })
  }
}

async function defaultBranch(dependencies: Dependencies): Promise<string> {
  const branch = await gitOutput(dependencies.runCommand, {
    worktreePath: dependencies.repositoryPath,
    arguments: ['symbolic-ref', 'refs/remotes/origin/HEAD', '--short'],
  })
  return branch.trim()
}

async function exists(dependencies: Dependencies, worktreePath: string): Promise<boolean> {
  const list = await gitOutput(dependencies.runCommand, {
    worktreePath: dependencies.repositoryPath,
    arguments: ['worktree', 'list', '--porcelain'],
  })
  return list.split('\n').includes(`worktree ${worktreePath}`)
}

async function branchExists(dependencies: Dependencies, branch: string): Promise<boolean> {
  const command = toGitCommand({
    worktreePath: dependencies.repositoryPath,
    arguments: ['show-ref', '--verify', '--quiet', `refs/heads/${branch}`],
  })
  const output = await dependencies.runCommand(command)
  return output.exitCode === 0
}
