import type { CheckWorkCommitted } from '@living-architecture/dev-workflow-v3-domain-model/domain/ports/check-work-committed'
import type {
  CommandOutput,
  CommandRequest,
} from '../../../../infra/external-clients/process/run-command'
import { gitOutput, toGitCommand } from '../../../../infra/external-clients/git/git'

type Dependencies = {
  readonly runCommand: (request: CommandRequest) => Promise<CommandOutput>
  readonly repositoryPath: string
}

/**
 * @riviere-role domain-port-adapter
 */
export function checkWorkCommittedWithGit(dependencies: Dependencies): CheckWorkCommitted {
  return async (request) => {
    const status = await gitOutput(dependencies.runCommand, {
      worktreePath: request.worktreePath,
      arguments: ['status', '--porcelain'],
    })
    const sha = await head(dependencies, request.worktreePath)
    const base = await defaultBranch(dependencies)
    const ahead = await gitOutput(dependencies.runCommand, {
      worktreePath: request.worktreePath,
      arguments: ['rev-list', '--count', `${base}..HEAD`],
    })
    return {
      clean: status.trim().length === 0,
      hasCommit: Number(ahead.trim()) > 0,
      sha,
      status: status.trim(),
      changedFiles: await changedSince(dependencies, request.worktreePath, request.from ?? base),
    }
  }
}

async function changedSince(
  dependencies: Dependencies,
  worktreePath: string,
  from: string,
): Promise<readonly string[]> {
  const diff = await gitOutput(dependencies.runCommand, {
    worktreePath,
    arguments: ['diff', '--name-only', `${from}..HEAD`],
  })
  return diff.split('\n').filter((file) => file.trim() !== '')
}

async function head(dependencies: Dependencies, worktreePath: string): Promise<string> {
  const command = toGitCommand({ worktreePath, arguments: ['rev-parse', 'HEAD'] })
  const output = await dependencies.runCommand(command)
  return output.exitCode === 0 ? output.stdout.trim() : ''
}

async function defaultBranch(dependencies: Dependencies): Promise<string> {
  const branch = await gitOutput(dependencies.runCommand, {
    worktreePath: dependencies.repositoryPath,
    arguments: ['symbolic-ref', 'refs/remotes/origin/HEAD', '--short'],
  })
  return branch.trim()
}
