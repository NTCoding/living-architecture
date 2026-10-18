import { assert, describe, expect, it, vi } from 'vitest'
import { AiCliAdapter } from './ai-cli-adapter'

type ClientInput = Readonly<{
  command: string
  args: readonly string[]
  timeoutMilliseconds: number
  standardInput?: string
}>

type ClientOutcome =
  | Readonly<{
      kind: 'exited'
      exitCode: number | null
      signal: string | null
      standardOutput: string
      standardError: string
    }>
  | Readonly<{ kind: 'spawn-failed'; reason: string }>
  | Readonly<{ kind: 'timed-out'; timeoutMilliseconds: number }>
  | Readonly<{ kind: 'output-exceeded'; stream: 'standardOutput' | 'standardError' }>

function createAdapter(outcome: ClientOutcome) {
  const run = vi.fn<(input: ClientInput) => Promise<ClientOutcome>>(() => Promise.resolve(outcome))
  return { adapter: new AiCliAdapter({ run }), run }
}

const completedOutcome: ClientOutcome = {
  kind: 'exited',
  exitCode: 0,
  signal: null,
  standardOutput: 'result',
  standardError: 'progress',
}

describe('AiCliAdapter ai-cli availability over the generic child process client', () => {
  it('reports available when the version probe starts the command', async () => {
    const { adapter, run } = createAdapter(completedOutcome)

    await expect(adapter.checkAvailability('ai-cli')).resolves.toStrictEqual({ kind: 'available' })
    expect(run).toHaveBeenCalledWith({
      command: 'ai-cli',
      args: ['--version'],
      timeoutMilliseconds: 5_000,
    })
  })

  it('reports available when the version probe exits non-zero after starting', async () => {
    const { adapter } = createAdapter({ ...completedOutcome, exitCode: 1 })

    await expect(adapter.checkAvailability('ai-cli')).resolves.toStrictEqual({ kind: 'available' })
  })

  it('reports available when the version probe is killed after starting', async () => {
    const { adapter } = createAdapter({ kind: 'timed-out', timeoutMilliseconds: 5_000 })

    await expect(adapter.checkAvailability('ai-cli')).resolves.toStrictEqual({ kind: 'available' })
  })

  it('reports unavailable with the client reason when the command cannot spawn', async () => {
    const { adapter } = createAdapter({ kind: 'spawn-failed', reason: 'ENOENT' })

    await expect(adapter.checkAvailability('ai-cli')).resolves.toStrictEqual({
      kind: 'unavailable',
      reason: 'ENOENT',
    })
  })
})

describe('AiCliAdapter ai-cli prompt delivery through the generic child process client', () => {
  it('passes the prompt on standard input when there is no placeholder', async () => {
    const { adapter, run } = createAdapter(completedOutcome)

    await adapter.run({
      command: 'ai-cli',
      args: ['--print'],
      prompt: 'explain the graph',
      timeoutMilliseconds: 30_000,
    })

    expect(run).toHaveBeenCalledWith({
      command: 'ai-cli',
      args: ['--print'],
      standardInput: 'explain the graph',
      timeoutMilliseconds: 30_000,
    })
  })

  it('substitutes a single prompt placeholder and closes standard input', async () => {
    const { adapter, run } = createAdapter(completedOutcome)

    await adapter.run({
      command: 'ai-cli',
      args: ['--message', '{prompt}', '--print'],
      prompt: 'explain the graph',
      timeoutMilliseconds: 30_000,
    })

    const [firstCall] = run.mock.calls
    assert(firstCall !== undefined)
    const input = firstCall[0]
    expect(input).toStrictEqual({
      command: 'ai-cli',
      args: ['--message', 'explain the graph', '--print'],
      timeoutMilliseconds: 30_000,
    })
    expect(input).not.toHaveProperty('standardInput')
  })

  it('rejects more than one prompt placeholder without invoking the client', async () => {
    const { adapter, run } = createAdapter(completedOutcome)

    await expect(
      adapter.run({
        command: 'ai-cli',
        args: ['{prompt}', '{prompt}'],
        prompt: 'explain the graph',
        timeoutMilliseconds: 30_000,
      }),
    ).resolves.toStrictEqual({
      kind: 'invalid-prompt-arguments',
      reason: 'Expected at most one {prompt} argument, got 2',
    })
    expect(run).not.toHaveBeenCalled()
  })
})

describe('AiCliAdapter ai-cli result mapping from the generic child process client', () => {
  it('maps a zero exit code to completed output', async () => {
    const { adapter } = createAdapter(completedOutcome)

    await expect(
      adapter.run({
        command: 'ai-cli',
        args: [],
        prompt: 'prompt',
        timeoutMilliseconds: 30_000,
      }),
    ).resolves.toStrictEqual({
      kind: 'completed',
      standardOutput: 'result',
      standardError: 'progress',
    })
  })

  it('maps a non-zero exit code to a typed failure', async () => {
    const { adapter } = createAdapter({ ...completedOutcome, exitCode: 2 })

    await expect(
      adapter.run({
        command: 'ai-cli',
        args: [],
        prompt: 'prompt',
        timeoutMilliseconds: 30_000,
      }),
    ).resolves.toStrictEqual({
      kind: 'exited-with-failure',
      exitCode: 2,
      standardOutput: 'result',
      standardError: 'progress',
    })
  })

  it('maps a null exit code to a typed failure', async () => {
    const { adapter } = createAdapter({ ...completedOutcome, exitCode: null })

    await expect(
      adapter.run({
        command: 'ai-cli',
        args: [],
        prompt: 'prompt',
        timeoutMilliseconds: 30_000,
      }),
    ).resolves.toStrictEqual({
      kind: 'exited-with-failure',
      exitCode: null,
      standardOutput: 'result',
      standardError: 'progress',
    })
  })

  it('maps a spawn failure to the typed port result', async () => {
    const { adapter } = createAdapter({ kind: 'spawn-failed', reason: 'ENOENT' })

    await expect(
      adapter.run({
        command: 'ai-cli',
        args: [],
        prompt: 'prompt',
        timeoutMilliseconds: 30_000,
      }),
    ).resolves.toStrictEqual({ kind: 'spawn-failed', reason: 'ENOENT' })
  })

  it('maps a timeout to the typed port result', async () => {
    const { adapter } = createAdapter({ kind: 'timed-out', timeoutMilliseconds: 30_000 })

    await expect(
      adapter.run({
        command: 'ai-cli',
        args: [],
        prompt: 'prompt',
        timeoutMilliseconds: 30_000,
      }),
    ).resolves.toStrictEqual({ kind: 'timed-out', timeoutMilliseconds: 30_000 })
  })

  it('maps bounded output to the typed port result', async () => {
    const { adapter } = createAdapter({ kind: 'output-exceeded', stream: 'standardError' })

    await expect(
      adapter.run({
        command: 'ai-cli',
        args: [],
        prompt: 'prompt',
        timeoutMilliseconds: 30_000,
      }),
    ).resolves.toStrictEqual({ kind: 'output-exceeded', stream: 'standardError' })
  })
})
