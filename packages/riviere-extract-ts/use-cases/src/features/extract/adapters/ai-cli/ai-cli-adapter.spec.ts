import { describe, expect, it, vi } from 'vitest'
import type { ChildProcessClient } from '../../../../infra/external-clients/child-process/child-process-client'
import type { RunAiCliInput } from '@living-architecture/riviere-extract-ts-domain-model/domain/ports/ai-cli'
import { AiCliAdapter } from './ai-cli-adapter'

function createClient() {
  const probe = vi.fn<ChildProcessClient['probe']>()
  const run = vi.fn<ChildProcessClient['run']>()
  return { client: { probe, run }, probe, run }
}

function createInput(
  argumentsValue: readonly string[],
  prompt = 'Discover missing events',
): RunAiCliInput {
  return {
    command: 'claude',
    arguments: argumentsValue,
    prompt,
    timeoutSeconds: 600,
  }
}

describe('AiCliAdapter availability', () => {
  it('probes the configured command and reports it available', () => {
    const { client, probe } = createClient()
    probe.mockReturnValue({ kind: 'available' })

    const result = new AiCliAdapter(client).checkAvailability('claude')

    expect(probe).toHaveBeenCalledWith('claude')
    expect(result).toStrictEqual({ kind: 'available' })
  })

  it('reports the probe failure reason when the configured command is unavailable', () => {
    const { client, probe } = createClient()
    probe.mockReturnValue({ kind: 'unavailable', reason: 'spawn claude ENOENT' })

    const result = new AiCliAdapter(client).checkAvailability('claude')

    expect(result).toStrictEqual({ kind: 'unavailable', reason: 'spawn claude ENOENT' })
  })
})

describe('AiCliAdapter prompt placement', () => {
  it('passes the prompt on standard input when no prompt argument is configured', () => {
    const { client, run } = createClient()
    run.mockReturnValue({ kind: 'completed', exitCode: 0, stdout: '', stderr: '' })

    new AiCliAdapter(client).run(createInput(['-p']))

    expect(run).toHaveBeenCalledWith({
      command: 'claude',
      arguments: ['-p'],
      stdin: 'Discover missing events',
      timeoutSeconds: 600,
    })
  })

  it('substitutes the prompt into the single prompt argument and leaves standard input empty', () => {
    const { client, run } = createClient()
    run.mockReturnValue({ kind: 'completed', exitCode: 0, stdout: '', stderr: '' })

    new AiCliAdapter(client).run(createInput(['--prompt', '{prompt}']))

    expect(run).toHaveBeenCalledWith({
      command: 'claude',
      arguments: ['--prompt', 'Discover missing events'],
      stdin: undefined,
      timeoutSeconds: 600,
    })
  })

  it('passes dollar sequences in the prompt through unchanged', () => {
    const { client, run } = createClient()
    run.mockReturnValue({ kind: 'completed', exitCode: 0, stdout: '', stderr: '' })

    new AiCliAdapter(client).run(
      createInput(['--message={prompt}'], "Cost is $$ and $& then $` and $' done"),
    )

    expect(run).toHaveBeenCalledWith({
      command: 'claude',
      arguments: ["--message=Cost is $$ and $& then $` and $' done"],
      stdin: undefined,
      timeoutSeconds: 600,
    })
  })

  it('substitutes a prompt placeholder embedded in a longer argument', () => {
    const { client, run } = createClient()
    run.mockReturnValue({ kind: 'completed', exitCode: 0, stdout: '', stderr: '' })

    new AiCliAdapter(client).run(createInput(['--message={prompt}']))

    expect(run).toHaveBeenCalledWith({
      command: 'claude',
      arguments: ['--message=Discover missing events'],
      stdin: undefined,
      timeoutSeconds: 600,
    })
  })

  it('returns an invocation failure when multiple prompt placeholders are configured', () => {
    const { client, run } = createClient()

    const result = new AiCliAdapter(client).run(createInput(['{prompt}', '{prompt}']))

    expect(result).toStrictEqual({
      kind: 'invocation-failure',
      reason: "Expected at most one '{prompt}' placeholder across AI CLI arguments, got 2.",
    })
    expect(run).not.toHaveBeenCalled()
  })
})

describe('AiCliAdapter result translation', () => {
  it('returns the command output when the command exits successfully', () => {
    const { client, run } = createClient()
    run.mockReturnValue({
      kind: 'completed',
      exitCode: 0,
      stdout: '{"components":[]}',
      stderr: '',
    })

    const result = new AiCliAdapter(client).run(createInput(['-p']))

    expect(result).toStrictEqual({ kind: 'success', output: '{"components":[]}' })
  })

  it('returns a typed non-zero exit result when the command fails', () => {
    const { client, run } = createClient()
    run.mockReturnValue({
      kind: 'completed',
      exitCode: 3,
      stdout: '',
      stderr: 'Authentication required',
    })

    const result = new AiCliAdapter(client).run(createInput(['-p']))

    expect(result).toStrictEqual({
      kind: 'non-zero-exit',
      exitCode: 3,
      stderr: 'Authentication required',
    })
  })

  it('returns a typed timeout when the command exceeds its timeout', () => {
    const { client, run } = createClient()
    run.mockReturnValue({ kind: 'timed-out' })

    const result = new AiCliAdapter(client).run(createInput(['-p']))

    expect(result).toStrictEqual({ kind: 'timeout' })
  })

  it('returns a typed output truncation result when captured output exceeds the bound', () => {
    const { client, run } = createClient()
    run.mockReturnValue({ kind: 'output-truncated', limitBytes: 1048576 })

    const result = new AiCliAdapter(client).run(createInput(['-p']))

    expect(result).toStrictEqual({ kind: 'output-truncated', limitBytes: 1048576 })
  })

  it('returns a typed invocation failure when the command cannot be spawned', () => {
    const { client, run } = createClient()
    run.mockReturnValue({ kind: 'spawn-failure', reason: 'spawn claude ENOENT' })

    const result = new AiCliAdapter(client).run(createInput(['-p']))

    expect(result).toStrictEqual({ kind: 'invocation-failure', reason: 'spawn claude ENOENT' })
  })
})
