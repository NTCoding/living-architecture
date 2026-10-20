import type { CommandOutput, CommandRequest } from '../run-command'

/** @riviere-role external-client-error */
export class NoOutputLeft extends Error {
  constructor() {
    super('No output is left for this command.')
    this.name = 'NoOutputLeft'
  }
}

export type CommandRecorder = ((request: CommandRequest) => Promise<CommandOutput>) & {
  readonly requests: readonly CommandRequest[]
}

export function fakeCommands(outputs: readonly CommandOutput[]): CommandRecorder {
  const requests: CommandRequest[] = []
  const run = async (request: CommandRequest): Promise<CommandOutput> => {
    requests.push(request)
    const output = outputs[requests.length - 1]
    if (output === undefined) throw new NoOutputLeft()
    return output
  }
  return Object.assign(run, { requests })
}

export function failingCommand(
  stderr: string,
): (request: CommandRequest) => Promise<CommandOutput> {
  return async () => ({ stdout: '', stderr, exitCode: 1 })
}
