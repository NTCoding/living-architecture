import type {
  AiCli,
  AiCliAvailability,
  RunAiCliInput,
  RunAiCliResult,
} from '@living-architecture/riviere-extract-ts-domain-model/domain/ports/ai-cli'
import {
  ChildProcessClient,
  type ChildProcessRunInput,
  type ChildProcessRunResult,
} from '../../../../infra/external-clients/child-process/child-process-client'
import { unresolvedReason } from '../../../../infra/external-clients/child-process/child-process-failure'

const PROMPT_PLACEHOLDER = '{prompt}'
const MAXIMUM_RESPONSE_BYTES = 1_048_576

type PromptInvocation =
  | Readonly<{
      readonly kind: 'stdin'
      readonly args: readonly string[]
      readonly stdin: string
    }>
  | Readonly<{ readonly kind: 'argument'; readonly args: readonly string[] }>
  | Readonly<{ readonly kind: 'invalid'; readonly reason: string }>

/** @riviere-role domain-port-adapter */
export class AiCliAdapter implements AiCli {
  constructor(private readonly childProcessClient: ChildProcessClient) {}

  async checkAvailability(command: string): Promise<AiCliAvailability> {
    const resolution = this.childProcessClient.resolveExecutable(command)
    if (resolution.kind === 'resolved') return { kind: 'available', command }
    return { kind: 'unavailable', command, reason: unresolvedReason(resolution) }
  }

  async run(input: RunAiCliInput): Promise<RunAiCliResult> {
    const invocation = promptInvocation(input.stageConfiguration.args, input.prompt)
    if (invocation.kind === 'invalid') return { kind: 'failed', reason: invocation.reason }
    const result = await this.childProcessClient.run(
      childProcessInput(input.stageConfiguration, invocation),
    )
    return mapResult(result)
  }
}

/** @riviere-role domain-port-adapter */
export function createAiCliAdapter(): AiCli {
  return new AiCliAdapter(new ChildProcessClient())
}

function childProcessInput(
  configuration: RunAiCliInput['stageConfiguration'],
  invocation: Extract<PromptInvocation, { kind: 'stdin' | 'argument' }>,
): ChildProcessRunInput {
  const childProcessInvocation = {
    command: configuration.command,
    args: invocation.args,
    timeoutMilliseconds: Math.ceil(configuration.timeoutSeconds * 1000),
    maximumOutputBytes: MAXIMUM_RESPONSE_BYTES,
  }
  if (invocation.kind === 'stdin') {
    return { ...childProcessInvocation, kind: 'pipe-stdin', stdin: invocation.stdin }
  }
  return { ...childProcessInvocation, kind: 'no-stdin' }
}

function promptInvocation(args: readonly string[], prompt: string): PromptInvocation {
  const placeholderCount = args.reduce(
    (count, argument) => count + occurrences(argument, PROMPT_PLACEHOLDER),
    0,
  )
  if (placeholderCount === 0) return { kind: 'stdin', args, stdin: prompt }
  if (placeholderCount > 1) {
    return {
      kind: 'invalid',
      reason: `Expected at most one '${PROMPT_PLACEHOLDER}' placeholder in args. Got ${placeholderCount}`,
    }
  }
  return {
    kind: 'argument',
    args: args.map((argument) => argument.replace(PROMPT_PLACEHOLDER, () => prompt)),
  }
}

function occurrences(value: string, search: string): number {
  return value.split(search).length - 1
}

function mapResult(result: ChildProcessRunResult): RunAiCliResult {
  switch (result.kind) {
    case 'completed':
      if (result.exitCode !== 0) {
        return {
          kind: 'failed',
          reason:
            result.stderr.text.length > 0
              ? result.stderr.text
              : 'AI CLI execution failed without a diagnostic',
        }
      }
      if (result.stdout.truncated) {
        return {
          kind: 'incomplete',
          output: result.stdout.text,
          reason: 'AI CLI output exceeded the allowed response size',
        }
      }
      return { kind: 'completed', output: result.stdout.text }
    case 'timed-out':
      return { kind: 'timed-out' }
    case 'terminated-by-signal':
      return { kind: 'failed', reason: `AI CLI was terminated by signal '${result.signal}'` }
    case 'stdin-failed':
      return { kind: 'failed', reason: result.reason }
    case 'spawn-failed':
      return { kind: 'failed', reason: result.reason }
  }
}
