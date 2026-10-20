import type { CommandOutput, CommandRequest } from '../process/run-command'
import { requireSuccess } from '../process/run-command'

/** @riviere-role external-client-model */
export interface GitRequest {
  readonly worktreePath: string
  readonly arguments: readonly string[]
}

/** @riviere-role external-client-service */
export function toGitCommand(request: GitRequest): CommandRequest {
  return {
    command: 'git',
    arguments: request.arguments,
    workingDirectory: request.worktreePath,
  }
}

/** @riviere-role external-client-service */
export async function gitOutput(
  runCommand: (request: CommandRequest) => Promise<CommandOutput>,
  request: GitRequest,
): Promise<string> {
  const command = toGitCommand(request)
  return requireSuccess(await runCommand(command), command)
}
