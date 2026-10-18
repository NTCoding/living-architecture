import { afterEach, describe, expect, it, vi } from 'vitest'
import type { RunAiCliInput } from '@living-architecture/riviere-extract-ts-domain-model/domain/ports/ai-cli'
import { ChildProcessClient } from '../../../../infra/external-clients/child-process/child-process-client'
import { AiCliAdapter } from './ai-cli-adapter'

function runInput(overrides: Partial<RunAiCliInput> = {}): RunAiCliInput {
  return {
    command: 'claude',
    args: ['-p'],
    prompt: 'Name the missing events',
    timeoutSeconds: 30,
    maximumOutputBytes: 1024,
    ...overrides,
  }
}

describe('AiCliAdapter availability', () => {
  const childProcessClient = new ChildProcessClient()
  const adapter = new AiCliAdapter(childProcessClient)

  afterEach(() => vi.restoreAllMocks())

  it('reports an available command when the child process client can run it', async () => {
    vi.spyOn(childProcessClient, 'checkCommand').mockResolvedValue({
      kind: 'available',
      command: 'claude',
    })

    await expect(adapter.checkAvailability('claude')).resolves.toStrictEqual({
      kind: 'available',
      command: 'claude',
    })
  })

  it('reports the child process reason when the command is unavailable', async () => {
    vi.spyOn(childProcessClient, 'checkCommand').mockResolvedValue({
      kind: 'unavailable',
      command: 'claude',
      reason: 'spawn claude ENOENT',
    })

    await expect(adapter.checkAvailability('claude')).resolves.toStrictEqual({
      kind: 'unavailable',
      command: 'claude',
      reason: 'spawn claude ENOENT',
    })
  })
})

describe('AiCliAdapter prompt passing', () => {
  const childProcessClient = new ChildProcessClient()
  const adapter = new AiCliAdapter(childProcessClient)

  afterEach(() => vi.restoreAllMocks())

  it('sends the prompt on stdin when args have no prompt placeholder', async () => {
    const run = vi.spyOn(childProcessClient, 'run').mockResolvedValue({
      kind: 'completed',
      exitCode: 0,
      stdout: 'answer',
      stderr: '',
      outputTruncated: false,
    })

    const result = await adapter.run(runInput())

    expect(run).toHaveBeenCalledWith({
      command: 'claude',
      args: ['-p'],
      stdin: 'Name the missing events',
      timeoutMilliseconds: 30_000,
      maximumOutputBytes: 1024,
    })
    expect(result).toStrictEqual({
      kind: 'success',
      output: 'answer',
      outputTruncated: false,
    })
  })

  it('replaces one prompt placeholder and leaves stdin empty', async () => {
    const run = vi.spyOn(childProcessClient, 'run').mockResolvedValue({
      kind: 'completed',
      exitCode: 0,
      stdout: 'answer',
      stderr: '',
      outputTruncated: false,
    })

    await adapter.run(runInput({ args: ['--instruction={prompt}', '--json'] }))

    expect(run).toHaveBeenCalledWith(
      expect.objectContaining({
        args: ['--instruction=Name the missing events', '--json'],
        stdin: undefined,
      }),
    )
  })

  it('rejects multiple prompt placeholders without invoking the child process', async () => {
    const run = vi.spyOn(childProcessClient, 'run')

    const result = await adapter.run(runInput({ args: ['{prompt}', '--again={prompt}'] }))

    expect(run).not.toHaveBeenCalled()
    expect(result).toStrictEqual({
      kind: 'invalid-arguments',
      reason: "Expected at most one '{prompt}' placeholder, got 2",
    })
  })
})

describe('AiCliAdapter result mapping', () => {
  const childProcessClient = new ChildProcessClient()
  const adapter = new AiCliAdapter(childProcessClient)

  afterEach(() => vi.restoreAllMocks())

  it('reports truncated output from a successful run', async () => {
    vi.spyOn(childProcessClient, 'run').mockResolvedValue({
      kind: 'completed',
      exitCode: 0,
      stdout: '{"partial":true}',
      stderr: '',
      outputTruncated: true,
    })

    await expect(adapter.run(runInput())).resolves.toStrictEqual({
      kind: 'success',
      output: '{"partial":true}',
      outputTruncated: true,
    })
  })

  it('maps a timed-out child process to a timeout result', async () => {
    vi.spyOn(childProcessClient, 'run').mockResolvedValue({
      kind: 'timed-out',
      stdout: 'partial',
      stderr: '',
      outputTruncated: false,
    })

    await expect(adapter.run(runInput({ timeoutSeconds: 2 }))).resolves.toStrictEqual({
      kind: 'timeout',
      timeoutSeconds: 2,
      partialOutput: 'partial',
    })
  })

  it('maps a spawn failure to a typed failure result', async () => {
    vi.spyOn(childProcessClient, 'run').mockResolvedValue({
      kind: 'spawn-failed',
      reason: 'spawn claude ENOENT',
    })

    await expect(adapter.run(runInput())).resolves.toStrictEqual({
      kind: 'spawn-failure',
      command: 'claude',
      reason: 'spawn claude ENOENT',
    })
  })

  it('maps a non-zero exit to an execution failure result', async () => {
    vi.spyOn(childProcessClient, 'run').mockResolvedValue({
      kind: 'completed',
      exitCode: 3,
      stdout: '',
      stderr: 'provider rejected the request',
      outputTruncated: false,
    })

    await expect(adapter.run(runInput())).resolves.toStrictEqual({
      kind: 'execution-failure',
      command: 'claude',
      exitCode: 3,
      stderr: 'provider rejected the request',
    })
  })
})
