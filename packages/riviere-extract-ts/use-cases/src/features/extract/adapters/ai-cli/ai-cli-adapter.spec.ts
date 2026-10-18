import { describe, expect, it, vi } from 'vitest'
import type { ChildProcessClient } from '../../../../infra/external-clients/child-process/child-process-client'
import type { RunAiCliInput } from '@living-architecture/riviere-extract-ts-domain-model/domain/ports/ai-cli'
import { AiCliAdapter } from './ai-cli-adapter'

function createClient() {
  const lookupExecutable = vi.fn<ChildProcessClient['lookupExecutable']>()
  const run = vi.fn<ChildProcessClient['run']>()
  return { client: { lookupExecutable, run }, lookupExecutable, run }
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
  it('looks up the configured command and reports it available', () => {
    const { client, lookupExecutable } = createClient()
    lookupExecutable.mockReturnValue({ kind: 'available' })

    const result = new AiCliAdapter(client).checkAvailability('claude')

    expect(lookupExecutable).toHaveBeenCalledWith('claude')
    expect(result).toStrictEqual({ kind: 'available' })
  })

  it('reports the lookup failure reason when the configured command is unavailable', () => {
    const { client, lookupExecutable } = createClient()
    lookupExecutable.mockReturnValue({
      kind: 'unavailable',
      reason: "Executable 'claude' was not found on PATH.",
    })

    const result = new AiCliAdapter(client).checkAvailability('claude')

    expect(result).toStrictEqual({
      kind: 'unavailable',
      reason: "Executable 'claude' was not found on PATH.",
    })
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

  it('passes dollar sequences in the prompt through unchanged', async () => {
    const { client, run } = createClient()
    run.mockResolvedValue({ kind: 'completed', exitCode: 0, stdout: '', stderr: '' })

    await new AiCliAdapter(client).run(
      createInput(['--message={prompt}'], "Cost is $$ and $& then $` and $' done"),
    )

    expect(run).toHaveBeenCalledWith({
      command: 'claude',
      arguments: ["--message=Cost is $$ and $& then $` and $' done"],
      stdin: undefined,
      timeoutSeconds: 600,
    })
  })

  it('substitutes a prompt placeholder embedded in a longer argument', async () => {
    const { client, run } = createClient()
    run.mockResolvedValue({ kind: 'completed', exitCode: 0, stdout: '', stderr: '' })

    await new AiCliAdapter(client).run(createInput(['--message={prompt}']))

    expect(run).toHaveBeenCalledWith({
      command: 'claude',
      arguments: ['--message=Discover missing events'],
      stdin: undefined,
      timeoutSeconds: 600,
    })
  })

  it('returns an invocation failure when multiple prompt placeholders are configured', async () => {
    const { client, run } = createClient()

    const result = await new AiCliAdapter(client).run(createInput(['{prompt}', '{prompt}']))

    expect(result).toStrictEqual({
      kind: 'invocation-failure',
      reason: "Expected at most one '{prompt}' placeholder across AI CLI arguments, got 2.",
    })
    expect(run).not.toHaveBeenCalled()
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

  it('returns a typed non-zero exit result when the command fails', async () => {
    const { client, run } = createClient()
    run.mockResolvedValue({
      kind: 'completed',
      exitCode: 3,
      stdout: '',
      stderr: 'Authentication required',
    })

    const result = await new AiCliAdapter(client).run(createInput(['-p']))

    expect(result).toStrictEqual({
      kind: 'non-zero-exit',
      exitCode: 3,
      stderr: 'Authentication required',
    })
  })

  it('returns a typed timeout when the command exceeds its timeout', async () => {
    const { client, run } = createClient()
    run.mockResolvedValue({ kind: 'timed-out' })

    const result = await new AiCliAdapter(client).run(createInput(['-p']))

    expect(result).toStrictEqual({ kind: 'timeout' })
  })

  it('returns a typed output truncation result when captured output exceeds the bound', async () => {
    const { client, run } = createClient()
    run.mockResolvedValue({ kind: 'output-truncated', limitBytes: 1048576 })

    const result = await new AiCliAdapter(client).run(createInput(['-p']))

    expect(result).toStrictEqual({ kind: 'output-truncated', limitBytes: 1048576 })
  })

  it('returns a typed invocation failure when the command cannot be spawned', async () => {
    const { client, run } = createClient()
    run.mockResolvedValue({ kind: 'spawn-failure', reason: 'spawn claude ENOENT' })

    const result = await new AiCliAdapter(client).run(createInput(['-p']))

    expect(result).toStrictEqual({ kind: 'invocation-failure', reason: 'spawn claude ENOENT' })
  })
})
