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

function completedResult(
  overrides: Partial<
    Extract<Awaited<ReturnType<ChildProcessClient['run']>>, { kind: 'completed' }>
  > = {},
) {
  return {
    kind: 'completed' as const,
    exitCode: 0,
    stdout: { text: 'answer', truncated: false },
    stderr: { text: '', truncated: false },
    ...overrides,
  }
}

const childProcessClient = new ChildProcessClient()
const adapter = new AiCliAdapter(childProcessClient)

afterEach(() => vi.restoreAllMocks())

describe('AiCliAdapter availability', () => {
  it('reports an available command when its executable resolves', async () => {
    vi.spyOn(childProcessClient, 'resolveExecutable').mockReturnValue({
      kind: 'resolved',
      executablePath: '/usr/local/bin/claude',
    })

    await expect(adapter.checkAvailability('claude')).resolves.toStrictEqual({
      kind: 'available',
      command: 'claude',
    })
  })

  it('reports an unavailable command when its executable is missing', async () => {
    vi.spyOn(childProcessClient, 'resolveExecutable').mockReturnValue({
      kind: 'not-found',
      command: 'claude',
    })

    await expect(adapter.checkAvailability('claude')).resolves.toStrictEqual({
      kind: 'unavailable',
      command: 'claude',
      reason: "Command 'claude' was not found on PATH",
    })
  })

  it('reports an unavailable command when the command is whitespace only', async () => {
    await expect(adapter.checkAvailability('   ')).resolves.toStrictEqual({
      kind: 'unavailable',
      command: '   ',
      reason: "Command '   ' was not found on PATH",
    })
  })

  it('does not spawn a process while checking availability', async () => {
    const resolveExecutable = vi.spyOn(childProcessClient, 'resolveExecutable').mockReturnValue({
      kind: 'not-found',
      command: 'claude',
    })
    const run = vi.spyOn(childProcessClient, 'run')

    await adapter.checkAvailability('claude')

    expect(resolveExecutable).toHaveBeenCalledWith('claude')
    expect(run).not.toHaveBeenCalled()
  })
})

describe('AiCliAdapter prompt passing', () => {
  it('sends the prompt on stdin when args have no prompt placeholder', async () => {
    const run = vi.spyOn(childProcessClient, 'run').mockResolvedValue(completedResult())

    await adapter.run(runInput())

    expect(run).toHaveBeenCalledWith({
      kind: 'pipe-stdin',
      command: 'claude',
      args: ['-p'],
      stdin: 'Name the missing events',
      timeoutMilliseconds: 30_000,
      maximumOutputBytes: 1024,
    })
  })

  it('replaces one prompt placeholder and sends no stdin', async () => {
    const run = vi.spyOn(childProcessClient, 'run').mockResolvedValue(completedResult())

    await adapter.run(runInput({ args: ['--instruction={prompt}', '--json'] }))

    expect(run).toHaveBeenCalledWith({
      kind: 'no-stdin',
      command: 'claude',
      args: ['--instruction=Name the missing events', '--json'],
      timeoutMilliseconds: 30_000,
      maximumOutputBytes: 1024,
    })
  })

  it('substitutes the prompt literally when it contains replacement patterns', async () => {
    const run = vi.spyOn(childProcessClient, 'run').mockResolvedValue(completedResult())

    await adapter.run(runInput({ args: ['--prompt={prompt}'], prompt: 'cost is $& and $$5' }))

    expect(run).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'no-stdin',
        args: ['--prompt=cost is $& and $$5'],
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
  it('reports truncated output from a successful run', async () => {
    vi.spyOn(childProcessClient, 'run').mockResolvedValue(
      completedResult({ stdout: { text: '{"partial":true}', truncated: true } }),
    )

    await expect(adapter.run(runInput())).resolves.toStrictEqual({
      kind: 'success',
      output: '{"partial":true}',
      outputTruncated: true,
    })
  })

  it('maps a timed-out child process to a timeout result', async () => {
    vi.spyOn(childProcessClient, 'run').mockResolvedValue({
      kind: 'timed-out',
      stdout: { text: 'partial', truncated: false },
      stderr: { text: 'warning', truncated: false },
    })

    await expect(adapter.run(runInput({ timeoutSeconds: 2 }))).resolves.toStrictEqual({
      kind: 'timeout',
      timeoutSeconds: 2,
      partialOutput: 'partial',
      partialError: 'warning',
    })
  })

  it('maps a signal termination to a signal-termination result', async () => {
    vi.spyOn(childProcessClient, 'run').mockResolvedValue({
      kind: 'terminated-by-signal',
      signal: 'SIGTERM',
      stdout: { text: 'partial', truncated: false },
      stderr: { text: 'warning', truncated: false },
    })

    await expect(adapter.run(runInput())).resolves.toStrictEqual({
      kind: 'signal-termination',
      command: 'claude',
      signal: 'SIGTERM',
      partialOutput: 'partial',
      partialError: 'warning',
    })
  })

  it('maps a stdin write failure to a stdin-failure result', async () => {
    vi.spyOn(childProcessClient, 'run').mockResolvedValue({
      kind: 'stdin-failed',
      reason: 'write EACCES',
    })

    await expect(adapter.run(runInput())).resolves.toStrictEqual({
      kind: 'stdin-failure',
      command: 'claude',
      reason: 'write EACCES',
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
    vi.spyOn(childProcessClient, 'run').mockResolvedValue(
      completedResult({
        exitCode: 3,
        stdout: { text: '', truncated: false },
        stderr: { text: 'provider rejected the request', truncated: false },
      }),
    )

    await expect(adapter.run(runInput())).resolves.toStrictEqual({
      kind: 'execution-failure',
      command: 'claude',
      exitCode: 3,
      stderr: 'provider rejected the request',
    })
  })
})
