import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AiExtractConfig } from '@living-architecture/riviere-extract-config-published-language'
import type { RunAiCliInput } from '@living-architecture/riviere-extract-ts-domain-model/domain/ports/ai-cli'
import { parseAiExtractConfig } from '@living-architecture/riviere-extract-config-published-language'
import { ChildProcessClient } from '../../../../infra/external-clients/child-process/child-process-client'
import { AiCliAdapter, createAiCliAdapter } from './ai-cli-adapter'

function extractConfiguration(overrides: Partial<AiExtractConfig> = {}): AiExtractConfig {
  return {
    command: 'claude',
    args: ['-p'],
    timeoutSeconds: 30,
    sources: ['./component.ts'],
    selection: { from: ['missing-events'], componentTypes: ['Event'] },
    outputs: { addComponents: true, addLinks: true },
    context: { exclude: [], maxFilesPerBatch: 10, maxBatches: 2 },
    ...overrides,
  }
}

function runInput(overrides: Partial<AiExtractConfig> = {}, prompt = 'Name the missing events') {
  return {
    stageConfiguration: extractConfiguration(overrides),
    prompt,
  } satisfies RunAiCliInput
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

  it('reports an unavailable command when its executable is missing from PATH', async () => {
    vi.spyOn(childProcessClient, 'resolveExecutable').mockReturnValue({
      kind: 'not-found',
      command: 'claude',
    })

    await expect(adapter.checkAvailability('claude')).resolves.toStrictEqual({
      kind: 'unavailable',
      command: 'claude',
      reason: "Expected executable 'claude'. Got not found. Context: no executable file exists",
    })
  })

  it('reports the same reason for availability and spawn failure when the executable is missing', async () => {
    vi.spyOn(childProcessClient, 'resolveExecutable').mockReturnValue({
      kind: 'not-found',
      command: 'claude',
    })

    const availability = await adapter.checkAvailability('claude')
    const runResult = await adapter.run(runInput())

    const availabilityReason =
      availability.kind === 'unavailable' ? availability.reason : 'expected unavailable'
    const runReason = runResult.kind === 'failed' ? runResult.reason : 'expected failed'
    expect(availabilityReason).toBe(runReason)
    expect(availabilityReason).toBe(
      "Expected executable 'claude'. Got not found. Context: no executable file exists",
    )
  })

  it('reports an unavailable command when a path-qualified executable is missing', async () => {
    vi.spyOn(childProcessClient, 'resolveExecutable').mockReturnValue({
      kind: 'not-found',
      command: '/opt/bin/claude',
    })

    await expect(adapter.checkAvailability('/opt/bin/claude')).resolves.toStrictEqual({
      kind: 'unavailable',
      command: '/opt/bin/claude',
      reason:
        "Expected executable '/opt/bin/claude'. Got not found. Context: no executable file exists",
    })
  })

  it('reports an unavailable command when the command is whitespace only', async () => {
    vi.spyOn(childProcessClient, 'resolveExecutable').mockReturnValue({
      kind: 'invalid-command',
      command: '   ',
    })

    await expect(adapter.checkAvailability('   ')).resolves.toStrictEqual({
      kind: 'unavailable',
      command: '   ',
      reason: "Expected a non-blank AI command. Got '   '. Context: command is required",
    })
  })

  it('reports an unavailable command when the resolved executable is unsupported', async () => {
    vi.spyOn(childProcessClient, 'resolveExecutable').mockReturnValue({
      kind: 'unsupported',
      command: 'claude',
      reason: 'Windows batch shims require a shell',
    })

    await expect(adapter.checkAvailability('claude')).resolves.toStrictEqual({
      kind: 'unavailable',
      command: 'claude',
      reason: 'Windows batch shims require a shell',
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
      maximumOutputBytes: 1_048_576,
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
      maximumOutputBytes: 1_048_576,
    })
  })

  it('fails without invoking the child process when multiple prompt placeholders bypass parser validation', async () => {
    const run = vi.spyOn(childProcessClient, 'run')

    const result = await adapter.run(runInput({ args: ['{prompt}', '--again={prompt}'] }))

    expect(run).not.toHaveBeenCalled()
    expect(result).toStrictEqual({
      kind: 'failed',
      reason: "Expected at most one '{prompt}' placeholder in args. Got 2",
    })
  })

  it('reports the same message as the config parser when args contain multiple prompt placeholders', async () => {
    const parserResult = parseAiExtractConfig({
      command: 'claude',
      args: ['{prompt}', '--again={prompt}'],
      'timeout-seconds': 30,
      sources: ['./component.ts'],
      selection: { from: ['missing-events'], 'component-types': ['Event'] },
      outputs: { 'add-components': true, 'add-links': true },
      context: { exclude: [], 'max-files-per-batch': 10, 'max-batches': 2 },
    })

    const result = await adapter.run(runInput({ args: ['{prompt}', '--again={prompt}'] }))

    const parserIssue = parserResult.success ? 'expected failure' : parserResult.issues[0]
    const runReason = result.kind === 'failed' ? result.reason : 'expected failed'
    expect(parserResult.success).toBe(false)
    expect(runReason).toBe(parserIssue)
  })

  it('substitutes the prompt literally when it contains replacement patterns', async () => {
    const run = vi.spyOn(childProcessClient, 'run').mockResolvedValue(completedResult())

    await adapter.run(runInput({ args: ['--prompt={prompt}'] }, 'cost is $& and $$5'))

    expect(run).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'no-stdin',
        args: ['--prompt=cost is $& and $$5'],
      }),
    )
  })
})

describe('AiCliAdapter result mapping', () => {
  it('reports completed output when the assistant succeeds', async () => {
    vi.spyOn(childProcessClient, 'run').mockResolvedValue(completedResult())

    await expect(adapter.run(runInput())).resolves.toStrictEqual({
      kind: 'completed',
      output: 'answer',
    })
  })

  it('reports incomplete output when the assistant response is truncated', async () => {
    vi.spyOn(childProcessClient, 'run').mockResolvedValue(
      completedResult({ stdout: { text: '{"partial":true}', truncated: true } }),
    )

    await expect(adapter.run(runInput())).resolves.toStrictEqual({
      kind: 'incomplete',
      output: '{"partial":true}',
      reason: 'AI CLI output exceeded the allowed response size',
    })
  })

  it('reports a timed-out result when the assistant exceeds its deadline', async () => {
    vi.spyOn(childProcessClient, 'run').mockResolvedValue({
      kind: 'timed-out',
      stdout: { text: 'partial', truncated: false },
      stderr: { text: 'warning', truncated: false },
    })

    await expect(adapter.run(runInput())).resolves.toStrictEqual({ kind: 'timed-out' })
  })

  it('reports a failure when the assistant is terminated by a signal', async () => {
    vi.spyOn(childProcessClient, 'run').mockResolvedValue({
      kind: 'terminated-by-signal',
      signal: 'SIGTERM',
      stdout: { text: 'partial', truncated: false },
      stderr: { text: 'warning', truncated: false },
    })

    await expect(adapter.run(runInput())).resolves.toStrictEqual({
      kind: 'failed',
      reason: "AI CLI was terminated by signal 'SIGTERM'",
    })
  })

  it('reports a failure when stdin cannot be written', async () => {
    vi.spyOn(childProcessClient, 'run').mockResolvedValue({
      kind: 'stdin-failed',
      reason: 'write EACCES',
    })

    await expect(adapter.run(runInput())).resolves.toStrictEqual({
      kind: 'failed',
      reason: 'write EACCES',
    })
  })

  it('reports a failure when the assistant cannot be spawned', async () => {
    vi.spyOn(childProcessClient, 'run').mockResolvedValue({
      kind: 'spawn-failed',
      reason: 'spawn claude ENOENT',
    })

    await expect(adapter.run(runInput())).resolves.toStrictEqual({
      kind: 'failed',
      reason: 'spawn claude ENOENT',
    })
  })

  it('reports a generic failure when the assistant exits non-zero without a diagnostic', async () => {
    vi.spyOn(childProcessClient, 'run').mockResolvedValue(
      completedResult({
        exitCode: 3,
        stdout: { text: '', truncated: false },
        stderr: { text: '', truncated: false },
      }),
    )

    await expect(adapter.run(runInput())).resolves.toStrictEqual({
      kind: 'failed',
      reason: 'AI CLI execution failed without a diagnostic',
    })
  })

  it('reports the provider diagnostic when the assistant exits non-zero', async () => {
    vi.spyOn(childProcessClient, 'run').mockResolvedValue(
      completedResult({
        exitCode: 3,
        stdout: { text: '', truncated: false },
        stderr: { text: 'provider rejected the request', truncated: false },
      }),
    )

    await expect(adapter.run(runInput())).resolves.toStrictEqual({
      kind: 'failed',
      reason: 'provider rejected the request',
    })
  })
})

describe('createAiCliAdapter', () => {
  it('returns an AiCli port implementation', () => {
    const created = createAiCliAdapter()

    expect(created.checkAvailability).toBeTypeOf('function')
    expect(created.run).toBeTypeOf('function')
  })
})
