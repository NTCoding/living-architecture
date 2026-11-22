import type { CommandOutput, CommandRequest } from '../process/run-command'
import { requireSuccess } from '../process/run-command'

/** @riviere-role external-client-model */
export interface GithubRequest {
  readonly workingDirectory: string
  readonly arguments: readonly string[]
}

/** @riviere-role external-client-service */
export function toGithubCommand(request: GithubRequest): CommandRequest {
  return {
    command: 'gh',
    arguments: request.arguments,
    workingDirectory: request.workingDirectory,
  }
}

/** @riviere-role external-client-service */
export async function ghOutput(
  runCommand: (request: CommandRequest) => Promise<CommandOutput>,
  request: GithubRequest,
): Promise<string> {
  const command = toGithubCommand(request)
  return requireSuccess(await runCommand(command), command)
}
