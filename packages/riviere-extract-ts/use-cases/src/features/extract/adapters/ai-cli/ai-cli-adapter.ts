import type {
  AiCli,
  AiCliAvailability,
  RunAiCliInput,
  RunAiCliResult,
} from '@living-architecture/riviere-extract-ts-domain-model/domain/ports/ai-cli'
import type {
  CapturedProcessOutput,
  ChildProcessClient,
  ChildProcessResult,
} from '../../../../infra/external-clients/child-process/child-process-client'

const PROMPT_PLACEHOLDER = '{prompt}'

type PromptInvocation = Readonly<{
  args: readonly string[]
  stdin?: string
}>

/** @riviere-role domain-port-adapter */
export class AiCliAdapter implements AiCli {
  constructor(private readonly client: ChildProcessClient) {}

  async checkAvailability(command: string): Promise<AiCliAvailability> {
    const availability = await this.client.checkExecutableAvailability(command)
    switch (availability.kind) {
      case 'available':
        return { kind: 'available' }
      case 'unavailable':
        return { kind: 'unavailable', command, reason: availability.reason }
    }
  }

  async run(input: RunAiCliInput): Promise<RunAiCliResult> {
    const invocation = promptInvocation(input)
    const result = await this.client.execute({
      command: input.command,
      args: invocation.args,
      ...(invocation.stdin === undefined ? {} : { stdin: invocation.stdin }),
      timeoutMilliseconds: input.timeoutMilliseconds,
    })
    return runResult(result)
  }
}

function promptInvocation(input: RunAiCliInput): PromptInvocation {
  const placeholderCount = input.args.filter((arg) => arg === PROMPT_PLACEHOLDER).length
  if (placeholderCount !== 1) return { args: [...input.args], stdin: input.prompt }
  return {
    args: input.args.map((arg) => (arg === PROMPT_PLACEHOLDER ? input.prompt : arg)),
  }
}

function runResult(result: ChildProcessResult): RunAiCliResult {
  switch (result.kind) {
    case 'exited':
      return result.exitCode === 0
        ? completedResult(result.stdout, result.stderr)
        : failedResult(result.exitCode, result.stdout, result.stderr)
    case 'timed-out':
      return {
        kind: 'timed-out',
        timeoutMilliseconds: result.timeoutMilliseconds,
        stdout: result.stdout,
        stderr: result.stderr,
      }
    case 'failed':
      return {
        kind: 'failed-to-launch',
        reason: result.reason,
        stdout: result.stdout,
        stderr: result.stderr,
      }
  }
}

function completedResult(
  stdout: CapturedProcessOutput,
  stderr: CapturedProcessOutput,
): RunAiCliResult {
  return { kind: 'completed', stdout, stderr }
}

function failedResult(
  exitCode: number,
  stdout: CapturedProcessOutput,
  stderr: CapturedProcessOutput,
): RunAiCliResult {
  return { kind: 'failed', exitCode, stdout, stderr }
}
