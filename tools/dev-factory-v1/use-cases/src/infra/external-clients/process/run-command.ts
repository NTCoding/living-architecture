/** @riviere-role external-client-model */
export interface CommandOutput {
  readonly stdout: string
  readonly stderr: string
  readonly exitCode: number
}

/** @riviere-role external-client-model */
export interface CommandRequest {
  readonly command: string
  readonly arguments: readonly string[]
  readonly workingDirectory: string
}

/** @riviere-role external-client-error */
export class CommandFailed extends Error {
  constructor(request: CommandRequest, output: CommandOutput) {
    super(
      `The command ${request.command} ${request.arguments.join(' ')} exited with ${output.exitCode}: ${output.stderr.trim()}`,
    )
    this.name = 'CommandFailed'
  }
}

/** @riviere-role external-client-service */
export function requireSuccess(output: CommandOutput, request: CommandRequest): string {
  if (output.exitCode !== 0) throw new CommandFailed(request, output)
  return output.stdout
}
