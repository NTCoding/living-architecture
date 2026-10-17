import type { CommitWork } from '@living-architecture/dev-workflow-v3-domain-model/domain/ports/commit-work'
import type {
  CommandOutput,
  CommandRequest,
} from '../../../../infra/external-clients/process/run-command'
import { gitOutput } from '../../../../infra/external-clients/git/git'

/**
 * Stages everything in the worktree and commits it. When there is nothing to
 * commit, as on a retry, it returns the commit that is already there.
 * @riviere-role domain-port-adapter
 */
export function commitWorkWithGit(dependencies: {
  readonly runCommand: (request: CommandRequest) => Promise<CommandOutput>
}): CommitWork {
  return async (request) => {
    const changes = await gitOutput(dependencies.runCommand, {
      worktreePath: request.worktreePath,
      arguments: ['status', '--porcelain'],
    })
    if (changes.trim().length === 0) {
      const current = await gitOutput(dependencies.runCommand, {
        worktreePath: request.worktreePath,
        arguments: ['rev-parse', 'HEAD'],
      })
      return { sha: current.trim() }
    }
    await gitOutput(dependencies.runCommand, {
      worktreePath: request.worktreePath,
      arguments: ['add', '--all'],
    })
    const commit = await dependencies.runCommand({
      command: 'git',
      arguments: ['commit', '--message', request.message],
      workingDirectory: request.worktreePath,
    })
    if (commit.exitCode !== 0) throw new CommitRefused(commit.stderr)
    const sha = await gitOutput(dependencies.runCommand, {
      worktreePath: request.worktreePath,
      arguments: ['rev-parse', 'HEAD'],
    })
    return { sha: sha.trim() }
  }
}

/** @riviere-role external-client-error */
class CommitRefused extends Error {
  constructor(stderr: string) {
    super(`The commit was refused: ${stderr.trim()}`)
    this.name = 'CommitRefused'
  }
}
