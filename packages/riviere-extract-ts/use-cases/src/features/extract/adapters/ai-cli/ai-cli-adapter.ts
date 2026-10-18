import type {
  AiCli,
  AiCliAvailability,
  RunAiCliInput,
  RunAiCliResult,
} from '@living-architecture/riviere-extract-ts-domain-model/domain/ports/ai-cli'
import type {
  ChildProcessClient,
  ChildProcessRunResult,
} from '../../../../infra/external-clients/child-process/child-process-client'

/** @riviere-role domain-port-adapter */
export class AiCliAdapter implements AiCli {
  constructor(private readonly client: ChildProcessClient) {}

  async checkAvailability(command: string): Promise<AiCliAvailability> {
    const result = await this.client.probe(command)
    switch (result.kind) {
      case 'available':
        return { kind: 'available' }
      case 'unavailable':
        return { kind: 'unavailable', reason: result.reason }
    }
  }

  async run(input: RunAiCliInput): Promise<RunAiCliResult> {
    const placement = input.invocation.resolvePrompt(input.prompt)
    const result = await this.client.run({
      command: input.invocation.commandText(),
      arguments: placement.arguments,
      stdin: placement.kind === 'argument' ? undefined : placement.stdin,
      timeoutSeconds: input.invocation.timeoutInSeconds(),
    })
    return toRunAiCliResult(result)
  }
}

function toRunAiCliResult(result: ChildProcessRunResult): RunAiCliResult {
  switch (result.kind) {
    case 'completed':
      if (result.exitCode === 0) return { kind: 'success', output: result.stdout }
      return { kind: 'invocation-failure', reason: describeExitFailure(result) }
    case 'timeout':
      return { kind: 'timeout' }
    case 'output-limit-exceeded':
      return {
        kind: 'invocation-failure',
        reason: `Command output exceeded ${result.limitBytes} bytes.`,
      }
    case 'invocation-failure':
      return { kind: 'invocation-failure', reason: result.reason }
  }
}

function describeExitFailure(result: ChildProcessRunResult & { kind: 'completed' }): string {
  const detail = result.stderr.trim()
  if (detail.length === 0) return `Command exited with code ${result.exitCode}.`
  return `Command exited with code ${result.exitCode}: ${detail}`
}
