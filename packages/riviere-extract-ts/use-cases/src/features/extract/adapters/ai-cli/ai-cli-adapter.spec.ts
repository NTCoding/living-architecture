import { describe, expect, it, vi } from 'vitest'
import type { ChildProcessClient } from '../../../../infra/external-clients/child-process/child-process-client'
import {
  AiCliArguments,
  AiCliCommand,
  AiCliInvocation,
  AiCliPrompt,
  AiCliTimeoutSeconds,
} from '@living-architecture/riviere-extract-ts-domain-model/domain/ai-cli-invocation'
import type { RunAiCliInput } from '@living-architecture/riviere-extract-ts-domain-model/domain/ports/ai-cli'
import { AiCliAdapter } from './ai-cli-adapter'

function createClient() {
  const probe = vi.fn<ChildProcessClient['probe']>()
  const run = vi.fn<ChildProcessClient['run']>()
  return { client: { probe, run }, probe, run }
}

function createInput(argumentsValue: readonly string[]): RunAiCliInput {
  return {
    invocation: AiCliInvocation.from({
      command: AiCliCommand.from('claude'),
      arguments: AiCliArguments.from(argumentsValue),
      timeoutSeconds: AiCliTimeoutSeconds.from(600),
    }),
    prompt: AiCliPrompt.from('Discover missing events'),
  }
}

describe('AiCliAdapter availability', () => {
  it('probes the configured command and reports it available', async () => {
    const { client, probe } = createClient()
    probe.mockResolvedValue({ kind: 'available' })

    const result = await new AiCliAdapter(client).checkAvailability('claude')

    expect(probe).toHaveBeenCalledWith('claude')
    expect(result).toStrictEqual({ kind: 'available' })
  })

  it('reports the probe failure reason when the configured command is unavailable', async () => {
    const { client, probe } = createClient()
    probe.mockResolvedValue({ kind: 'unavailable', reason: 'spawn claude ENOENT' })

    const result = await new AiCliAdapter(client).checkAvailability('claude')

    expect(result).toStrictEqual({ kind: 'unavailable', reason: 'spawn claude ENOENT' })
  })
})

describe('AiCliAdapter prompt placement', () => {
  it('passes the prompt on standard input when no prompt argument is configured', async () => {
    const { client, run } = createClient()
    run.mockResolvedValue({ kind: 'completed', exitCode: 0, stdout: '', stderr: '' })

    await new AiCliAdapter(client).run(createInput(['-p']))

    expect(run).toHaveBeenCalledWith({
      command: 'claude',
      arguments: ['-p'],
      stdin: 'Discover missing events',
      timeoutSeconds: 600,
    })
  })

  it('substitutes the prompt into the single prompt argument and leaves standard input empty', async () => {
    const { client, run } = createClient()
    run.mockResolvedValue({ kind: 'completed', exitCode: 0, stdout: '', stderr: '' })

    await new AiCliAdapter(client).run(createInput(['--prompt', '{prompt}']))

    expect(run).toHaveBeenCalledWith({
      command: 'claude',
      arguments: ['--prompt', 'Discover missing events'],
      stdin: undefined,
      timeoutSeconds: 600,
    })
  })
})

describe('AiCliAdapter result translation', () => {
  it('returns the command output when the command exits successfully', async () => {
    const { client, run } = createClient()
    run.mockResolvedValue({
      kind: 'completed',
      exitCode: 0,
      stdout: '{"components":[]}',
      stderr: '',
    })

    const result = await new AiCliAdapter(client).run(createInput(['-p']))

    expect(result).toStrictEqual({ kind: 'success', output: '{"components":[]}' })
  })

  it('returns a typed timeout when the command exceeds its timeout', async () => {
    const { client, run } = createClient()
    run.mockResolvedValue({ kind: 'timeout' })

    const result = await new AiCliAdapter(client).run(createInput(['-p']))

    expect(result).toStrictEqual({ kind: 'timeout' })
  })

  it('returns a typed invocation failure with the command error detail', async () => {
    const { client, run } = createClient()
    run.mockResolvedValue({
      kind: 'completed',
      exitCode: 3,
      stdout: '',
      stderr: 'Authentication required\n',
    })

    const result = await new AiCliAdapter(client).run(createInput(['-p']))

    expect(result).toStrictEqual({
      kind: 'invocation-failure',
      reason: 'Command exited with code 3: Authentication required',
    })
  })

  it('returns a typed invocation failure when the command exits without error detail', async () => {
    const { client, run } = createClient()
    run.mockResolvedValue({ kind: 'completed', exitCode: 2, stdout: '', stderr: '   ' })

    const result = await new AiCliAdapter(client).run(createInput(['-p']))

    expect(result).toStrictEqual({
      kind: 'invocation-failure',
      reason: 'Command exited with code 2.',
    })
  })

  it('returns a typed invocation failure when captured output exceeds the limit', async () => {
    const { client, run } = createClient()
    run.mockResolvedValue({ kind: 'output-limit-exceeded', limitBytes: 1048576 })

    const result = await new AiCliAdapter(client).run(createInput(['-p']))

    expect(result).toStrictEqual({
      kind: 'invocation-failure',
      reason: 'Command output exceeded 1048576 bytes.',
    })
  })

  it('returns a typed invocation failure when the command cannot be spawned', async () => {
    const { client, run } = createClient()
    run.mockResolvedValue({ kind: 'invocation-failure', reason: 'spawn claude ENOENT' })

    const result = await new AiCliAdapter(client).run(createInput(['-p']))

    expect(result).toStrictEqual({ kind: 'invocation-failure', reason: 'spawn claude ENOENT' })
  })
})
