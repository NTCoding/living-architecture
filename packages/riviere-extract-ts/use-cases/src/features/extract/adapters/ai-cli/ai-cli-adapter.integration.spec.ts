import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  AiCliArguments,
  AiCliCommand,
  AiCliInvocation,
  AiCliPrompt,
  AiCliTimeoutSeconds,
} from '@living-architecture/riviere-extract-ts-domain-model/domain/ai-cli-invocation'
import type { RunAiCliInput } from '@living-architecture/riviere-extract-ts-domain-model/domain/ports/ai-cli'
import { createChildProcessClient } from '../../../../infra/external-clients/child-process/child-process-client'
import { AiCliAdapter } from './ai-cli-adapter'

const stubPath = fileURLToPath(
  new URL(
    '../../../../infra/external-clients/child-process/__fixtures__/ai-cli-stub.mjs',
    import.meta.url,
  ),
)
const adapter = new AiCliAdapter(createChildProcessClient())

function createInput(
  mode: string,
  argumentsValue: readonly string[],
  prompt: string,
  timeoutSeconds = 5,
): RunAiCliInput {
  return {
    invocation: AiCliInvocation.from({
      command: AiCliCommand.from(process.execPath),
      arguments: AiCliArguments.from([stubPath, mode, ...argumentsValue]),
      timeoutSeconds: AiCliTimeoutSeconds.from(timeoutSeconds),
    }),
    prompt: AiCliPrompt.from(prompt),
  }
}

describe('AiCliAdapter with a stub executable', () => {
  it('reports a spawnable configured command as available', async () => {
    const result = await adapter.checkAvailability(process.execPath)

    expect(result).toStrictEqual({ kind: 'available' })
  })

  it('invokes the configured executable with the prompt on standard input', async () => {
    const result = await adapter.run(createInput('echo-stdin', [], 'Discover missing events'))

    expect(result).toStrictEqual({ kind: 'success', output: 'stdin:Discover missing events' })
  })

  it('invokes the configured executable with the prompt substituted as an argument', async () => {
    const result = await adapter.run(createInput('echo-arguments', ['{prompt}'], 'hello'))

    expect(result).toStrictEqual({ kind: 'success', output: 'arguments:hello' })
  })

  it('returns a typed timeout when the stub executable exceeds its timeout', async () => {
    const result = await adapter.run(createInput('sleep', ['5000'], 'slow prompt', 1))

    expect(result).toStrictEqual({ kind: 'timeout' })
  })
})
