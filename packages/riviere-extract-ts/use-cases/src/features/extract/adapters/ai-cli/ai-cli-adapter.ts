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

const PROMPT_PLACEHOLDER = '{prompt}'

type PromptInvocation =
  | Readonly<{ readonly kind: 'stdin'; readonly args: readonly string[] }>
  | Readonly<{ readonly kind: 'argument'; readonly args: readonly string[] }>
  | Readonly<{ readonly kind: 'invalid'; readonly reason: string }>

function promptInvocation(args: readonly string[], prompt: string): PromptInvocation {
  const placeholderCount = args.reduce(
    (count, argument) => count + occurrences(argument, PROMPT_PLACEHOLDER),
    0,
  )
  if (placeholderCount === 0) return { kind: 'stdin', args }
  if (placeholderCount > 1) {
    return {
      kind: 'invalid',
      reason: `Expected at most one '${PROMPT_PLACEHOLDER}' placeholder, got ${placeholderCount}`,
    }
  }
  return {
    kind: 'argument',
    args: args.map((argument) => argument.replace(PROMPT_PLACEHOLDER, prompt)),
  }
}

function occurrences(value: string, search: string): number {
  return value.split(search).length - 1
}

function mapResult(
  command: string,
  timeoutSeconds: number,
  result: ChildProcessRunResult,
): RunAiCliResult {
  switch (result.kind) {
    case 'completed':
      if (result.exitCode !== 0) {
        return {
          kind: 'execution-failure',
          command,
          exitCode: result.exitCode,
          stderr: result.stderr,
        }
      }
      return {
        kind: 'success',
        output: result.stdout,
        outputTruncated: result.outputTruncated,
      }
    case 'timed-out':
      return { kind: 'timeout', timeoutSeconds, partialOutput: result.stdout }
    case 'spawn-failed':
      return { kind: 'spawn-failure', command, reason: result.reason }
  }
}

/** @riviere-role domain-port-adapter */
export class AiCliAdapter implements AiCli {
  constructor(private readonly childProcessClient: ChildProcessClient) {}

  async checkAvailability(command: string): Promise<AiCliAvailability> {
    const availability = await this.childProcessClient.checkCommand(command)
    if (availability.kind === 'unavailable') {
      return { kind: 'unavailable', command, reason: availability.reason }
    }
    return { kind: 'available', command }
  }

  async run(input: RunAiCliInput): Promise<RunAiCliResult> {
    const invocation = promptInvocation(input.args, input.prompt)
    if (invocation.kind === 'invalid')
      return { kind: 'invalid-arguments', reason: invocation.reason }
    const result = await this.childProcessClient.run({
      command: input.command,
      args: invocation.args,
      stdin: invocation.kind === 'stdin' ? input.prompt : undefined,
      timeoutMilliseconds: Math.ceil(input.timeoutSeconds * 1000),
      maximumOutputBytes: input.maximumOutputBytes,
    })
    return mapResult(input.command, input.timeoutSeconds, result)
  }
}
