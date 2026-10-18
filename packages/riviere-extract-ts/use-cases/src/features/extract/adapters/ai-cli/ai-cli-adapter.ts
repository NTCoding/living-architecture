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

type PromptPlacement =
  | Readonly<{ kind: 'argument'; arguments: readonly string[] }>
  | Readonly<{ kind: 'standard-input'; arguments: readonly string[]; stdin: string }>
  | Readonly<{ kind: 'invalid'; reason: string }>

/** @riviere-role domain-port-adapter */
export class AiCliAdapter implements AiCli {
  constructor(private readonly client: ChildProcessClient) {}

  checkAvailability(command: string): AiCliAvailability {
    const result = this.client.probe(command)
    switch (result.kind) {
      case 'available':
        return { kind: 'available' }
      case 'unavailable':
        return { kind: 'unavailable', reason: result.reason }
    }
  }

  run(input: RunAiCliInput): RunAiCliResult {
    const placement = resolvePromptPlacement(input.arguments, input.prompt)
    if (placement.kind === 'invalid')
      return { kind: 'invocation-failure', reason: placement.reason }
    const result = this.client.run({
      command: input.command,
      arguments: placement.arguments,
      stdin: placement.kind === 'standard-input' ? placement.stdin : undefined,
      timeoutSeconds: input.timeoutSeconds,
    })
    return toRunAiCliResult(result)
  }
}

function resolvePromptPlacement(
  argumentsValue: readonly string[],
  prompt: string,
): PromptPlacement {
  const placeholderCount = argumentsValue.reduce(
    (count, value) => count + countPromptPlaceholders(value),
    0,
  )
  if (placeholderCount > 1) {
    return {
      kind: 'invalid',
      reason: `Expected at most one '${PROMPT_PLACEHOLDER}' placeholder across AI CLI arguments, got ${placeholderCount}.`,
    }
  }
  if (placeholderCount === 0) {
    return { kind: 'standard-input', arguments: [...argumentsValue], stdin: prompt }
  }
  return {
    kind: 'argument',
    arguments: argumentsValue.map((value) => value.replaceAll(PROMPT_PLACEHOLDER, () => prompt)),
  }
}

function countPromptPlaceholders(value: string): number {
  return value.split(PROMPT_PLACEHOLDER).length - 1
}

function toRunAiCliResult(result: ChildProcessRunResult): RunAiCliResult {
  switch (result.kind) {
    case 'completed':
      if (result.exitCode === 0) return { kind: 'success', output: result.stdout }
      return { kind: 'non-zero-exit', exitCode: result.exitCode, stderr: result.stderr }
    case 'timed-out':
      return { kind: 'timeout' }
    case 'output-truncated':
      return { kind: 'output-truncated', limitBytes: result.limitBytes }
    case 'spawn-failure':
      return { kind: 'invocation-failure', reason: result.reason }
  }
}
