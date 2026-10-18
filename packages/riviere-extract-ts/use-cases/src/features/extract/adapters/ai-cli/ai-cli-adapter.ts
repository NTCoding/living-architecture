import type { AiCli } from '@living-architecture/riviere-extract-ts-domain-model/domain/ports/ai-cli'
import type { ChildProcessClient } from '../../../../infra/external-clients/child-process/child-process-client'

type AiCliAvailability = Awaited<ReturnType<AiCli['checkAvailability']>>
type RunAiCliInput = Parameters<AiCli['run']>[0]
type RunAiCliResult = Awaited<ReturnType<AiCli['run']>>

const promptPlaceholder = '{prompt}'
const availabilityTimeoutMilliseconds = 5_000

type ChildProcessRunner = Pick<ChildProcessClient, 'run'>

/** @riviere-role domain-port-adapter */
export class AiCliAdapter implements AiCli {
  constructor(
    private readonly client: ChildProcessRunner,
    private readonly availabilityTimeout: number = availabilityTimeoutMilliseconds,
  ) {}

  async checkAvailability(command: string): Promise<AiCliAvailability> {
    const outcome = await this.client.run({
      command,
      args: ['--version'],
      timeoutMilliseconds: this.availabilityTimeout,
    })
    if (outcome.kind === 'spawn-failed') return { kind: 'unavailable', reason: outcome.reason }
    return { kind: 'available' }
  }

  async run(input: RunAiCliInput): Promise<RunAiCliResult> {
    const promptPlaceholderCount = input.args.filter(
      (argument) => argument === promptPlaceholder,
    ).length
    if (promptPlaceholderCount > 1) {
      return {
        kind: 'invalid-prompt-arguments',
        reason: `Expected at most one ${promptPlaceholder} argument, got ${promptPlaceholderCount}`,
      }
    }
    const substitutesPrompt = promptPlaceholderCount === 1
    const args = substitutesPrompt
      ? input.args.map((argument) => (argument === promptPlaceholder ? input.prompt : argument))
      : input.args
    const outcome = await this.client.run({
      command: input.command,
      args,
      timeoutMilliseconds: input.timeoutMilliseconds,
      ...(substitutesPrompt ? {} : { standardInput: input.prompt }),
    })
    switch (outcome.kind) {
      case 'exited':
        if (outcome.exitCode === 0) {
          return {
            kind: 'completed',
            standardOutput: outcome.standardOutput,
            standardError: outcome.standardError,
          }
        }
        return {
          kind: 'exited-with-failure',
          exitCode: outcome.exitCode,
          standardOutput: outcome.standardOutput,
          standardError: outcome.standardError,
        }
      case 'spawn-failed':
        return { kind: 'spawn-failed', reason: outcome.reason }
      case 'timed-out':
        return { kind: 'timed-out', timeoutMilliseconds: outcome.timeoutMilliseconds }
      case 'output-exceeded':
        return { kind: 'output-exceeded', stream: outcome.stream }
    }
  }
}
