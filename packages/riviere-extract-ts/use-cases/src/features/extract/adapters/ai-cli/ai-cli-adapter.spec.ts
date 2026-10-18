import { describe, expect, it, vi } from 'vitest'
import type {
  CapturedProcessOutput,
  ChildProcessClient,
} from '../../../../infra/external-clients/child-process/child-process-client'
import type { RunAiCliInput } from '@living-architecture/riviere-extract-ts-domain-model/domain/ports/ai-cli'
import { AiCliAdapter } from './ai-cli-adapter'

const emptyOutput: CapturedProcessOutput = { text: '', truncated: false }

function runInput(overrides: Partial<RunAiCliInput> = {}): RunAiCliInput {
  return {
    command: 'claude',
    args: ['-p'],
    prompt: 'List architecture gaps',
    timeoutMilliseconds: 600_000,
    ...overrides,
  }
}

function unavailableClient(reason: string) {
  const checkExecutableAvailability = vi.fn<ChildProcessClient['checkExecutableAvailability']>()
  checkExecutableAvailability.mockResolvedValue({ kind: 'unavailable', reason })
  const client: ChildProcessClient = {
    checkExecutableAvailability,
    execute: vi.fn<ChildProcessClient['execute']>(),
  }
  return { client, checkExecutableAvailability }
}

describe('AiCliAdapter.checkAvailability', () => {
  it('reports the configured command as unavailable with the locator reason', async () => {
    const { client, checkExecutableAvailability } = unavailableClient(
      "'claude' is not installed or not in PATH",
    )

    const result = await new AiCliAdapter(client).checkAvailability('claude')

    expect(checkExecutableAvailability).toHaveBeenCalledWith('claude')
    expect(result).toStrictEqual({
      kind: 'unavailable',
      command: 'claude',
      reason: "'claude' is not installed or not in PATH",
    })
  })

  it('reports the configured command as available when the locator succeeds', async () => {
    const checkExecutableAvailability = vi.fn<ChildProcessClient['checkExecutableAvailability']>()
    checkExecutableAvailability.mockResolvedValue({ kind: 'available' })
    const subject = new AiCliAdapter({ checkExecutableAvailability, execute: vi.fn() })

    const result = await subject.checkAvailability('claude')

    expect(result).toStrictEqual({ kind: 'available' })
  })
})

describe('AiCliAdapter.run', () => {
  it('writes the prompt to stdin when no argument placeholder is configured', async () => {
    const execute = vi.fn<ChildProcessClient['execute']>()
    execute.mockResolvedValue({
      kind: 'exited',
      exitCode: 0,
      stdout: emptyOutput,
      stderr: emptyOutput,
    })

    const result = await new AiCliAdapter({ checkExecutableAvailability: vi.fn(), execute }).run(
      runInput(),
    )

    expect(execute).toHaveBeenCalledWith({
      command: 'claude',
      args: ['-p'],
      stdin: 'List architecture gaps',
      timeoutMilliseconds: 600_000,
    })
    expect(result).toStrictEqual({ kind: 'completed', stdout: emptyOutput, stderr: emptyOutput })
  })

  it('replaces the single prompt placeholder and leaves stdin unwritten when one is configured', async () => {
    const execute = vi.fn<ChildProcessClient['execute']>()
    execute.mockResolvedValue({
      kind: 'exited',
      exitCode: 0,
      stdout: emptyOutput,
      stderr: emptyOutput,
    })

    await new AiCliAdapter({ checkExecutableAvailability: vi.fn(), execute }).run(
      runInput({ args: ['--prompt', '{prompt}', '--model', 'opus'] }),
    )

    expect(execute).toHaveBeenCalledWith({
      command: 'claude',
      args: ['--prompt', 'List architecture gaps', '--model', 'opus'],
      timeoutMilliseconds: 600_000,
    })
  })

  it('returns a typed timeout result when the CLI exceeds its timeout', async () => {
    const execute = vi.fn<ChildProcessClient['execute']>()
    execute.mockResolvedValue({
      kind: 'timed-out',
      timeoutMilliseconds: 600_000,
      stdout: { text: 'partial', truncated: false },
      stderr: emptyOutput,
    })

    const result = await new AiCliAdapter({ checkExecutableAvailability: vi.fn(), execute }).run(
      runInput(),
    )

    expect(result).toStrictEqual({
      kind: 'timed-out',
      timeoutMilliseconds: 600_000,
      stdout: { text: 'partial', truncated: false },
      stderr: emptyOutput,
    })
  })

  it('returns a typed failure with the exit code when the CLI exits non-zero', async () => {
    const execute = vi.fn<ChildProcessClient['execute']>()
    execute.mockResolvedValue({
      kind: 'exited',
      exitCode: 2,
      stdout: emptyOutput,
      stderr: { text: 'bad prompt', truncated: false },
    })

    const result = await new AiCliAdapter({ checkExecutableAvailability: vi.fn(), execute }).run(
      runInput(),
    )

    expect(result).toStrictEqual({
      kind: 'failed',
      exitCode: 2,
      stdout: emptyOutput,
      stderr: { text: 'bad prompt', truncated: false },
    })
  })

  it('returns a typed failure when the CLI cannot be launched', async () => {
    const execute = vi.fn<ChildProcessClient['execute']>()
    execute.mockResolvedValue({
      kind: 'failed',
      reason: 'spawn claude ENOENT',
      stdout: emptyOutput,
      stderr: emptyOutput,
    })

    const result = await new AiCliAdapter({ checkExecutableAvailability: vi.fn(), execute }).run(
      runInput(),
    )

    expect(result).toStrictEqual({
      kind: 'failed-to-launch',
      reason: 'spawn claude ENOENT',
      stdout: emptyOutput,
      stderr: emptyOutput,
    })
  })

  it('preserves bounded-output truncation reported by the process client', async () => {
    const execute = vi.fn<ChildProcessClient['execute']>()
    execute.mockResolvedValue({
      kind: 'exited',
      exitCode: 0,
      stdout: { text: '{"components":', truncated: true },
      stderr: { text: 'warning', truncated: true },
    })

    const result = await new AiCliAdapter({ checkExecutableAvailability: vi.fn(), execute }).run(
      runInput(),
    )

    expect(result).toStrictEqual({
      kind: 'completed',
      stdout: { text: '{"components":', truncated: true },
      stderr: { text: 'warning', truncated: true },
    })
  })
})
