import { describe, expect, it } from 'vitest'
import { ChildProcessClient } from './child-process-client'

type CapturedSpawnInput = Readonly<{
  command: string
  args: readonly string[]
  shell: boolean
  environment: NodeJS.ProcessEnv
}>

type FakeSpawnOptions = Readonly<{
  failSpawn?: unknown
  failStandardInput?: unknown
}>

class SpawnFailure extends Error {}

class StandardInputFailure extends Error {}

class FakeSpawnedProcess {
  readonly standardInputs: (string | undefined)[] = []
  killCount = 0
  private standardOutputListener: ((chunk: Buffer) => void) | undefined
  private standardErrorListener: ((chunk: Buffer) => void) | undefined
  private spawnErrorListener: ((error: Error) => void) | undefined
  private closeListener:
    | ((status: { exitCode: number | null; signal: string | null }) => void)
    | undefined

  writeStandardInput = (contents: string | undefined): void => {
    this.standardInputs.push(contents)
  }

  onStandardOutput = (listener: (chunk: Buffer) => void): void => {
    this.standardOutputListener = listener
  }

  onStandardError = (listener: (chunk: Buffer) => void): void => {
    this.standardErrorListener = listener
  }

  onSpawnError = (listener: (error: Error) => void): void => {
    this.spawnErrorListener = listener
  }

  onClose = (
    listener: (status: { exitCode: number | null; signal: string | null }) => void,
  ): void => {
    this.closeListener = listener
  }

  kill = (): void => {
    this.killCount += 1
  }

  emitStandardOutput(chunk: Buffer): void {
    this.standardOutputListener?.(chunk)
  }

  emitStandardError(chunk: Buffer): void {
    this.standardErrorListener?.(chunk)
  }

  emitSpawnError(error: Error): void {
    this.spawnErrorListener?.(error)
  }

  emitClose(exitCode: number | null, signal: string | null): void {
    this.closeListener?.({ exitCode, signal })
  }
}

function createClient(options: FakeSpawnOptions = {}) {
  const spawned = new FakeSpawnedProcess()
  const spawnInputs: CapturedSpawnInput[] = []
  const client = new ChildProcessClient((input) => {
    spawnInputs.push(input)
    if (options.failSpawn !== undefined) throw options.failSpawn
    return {
      ...spawned,
      writeStandardInput: (contents: string | undefined) => {
        if (options.failStandardInput !== undefined) throw options.failStandardInput
        spawned.writeStandardInput(contents)
      },
    }
  })
  return { client, spawned, spawnInputs }
}

describe('ChildProcessClient ai-cli spawn mechanics', () => {
  it('spawns the command without a shell using the inherited environment', async () => {
    const { client, spawned, spawnInputs } = createClient()

    const outcome = client.run({
      command: 'ai-cli',
      args: ['--flag', 'value'],
      timeoutMilliseconds: 1_000,
    })
    spawned.emitClose(0, null)

    await expect(outcome).resolves.toStrictEqual({
      kind: 'exited',
      exitCode: 0,
      signal: null,
      standardOutput: '',
      standardError: '',
    })
    expect(spawnInputs).toStrictEqual([
      {
        command: 'ai-cli',
        args: ['--flag', 'value'],
        shell: false,
        environment: process.env,
      },
    ])
  })

  it('writes the prompt to standard input and closes it', async () => {
    const { client, spawned } = createClient()

    const outcome = client.run({
      command: 'ai-cli',
      args: [],
      timeoutMilliseconds: 1_000,
      standardInput: 'explain this graph',
    })
    spawned.emitClose(0, null)

    await expect(outcome).resolves.toMatchObject({ kind: 'exited' })
    expect(spawned.standardInputs).toStrictEqual(['explain this graph'])
  })

  it('closes standard input without contents when no prompt is provided', async () => {
    const { client, spawned } = createClient()

    const outcome = client.run({
      command: 'ai-cli',
      args: [],
      timeoutMilliseconds: 1_000,
    })
    spawned.emitClose(0, null)

    await expect(outcome).resolves.toMatchObject({ kind: 'exited' })
    expect(spawned.standardInputs).toStrictEqual([undefined])
  })

  it('captures every standard output and standard error chunk', async () => {
    const { client, spawned } = createClient()

    const outcome = client.run({
      command: 'ai-cli',
      args: [],
      timeoutMilliseconds: 1_000,
    })
    spawned.emitStandardOutput(Buffer.from('first '))
    spawned.emitStandardOutput(Buffer.from('second'))
    spawned.emitStandardError(Buffer.from('warning'))
    spawned.emitClose(0, null)

    await expect(outcome).resolves.toStrictEqual({
      kind: 'exited',
      exitCode: 0,
      signal: null,
      standardOutput: 'first second',
      standardError: 'warning',
    })
  })

  it('reports a non-zero exit code and termination signal', async () => {
    const { client, spawned } = createClient()

    const outcome = client.run({
      command: 'ai-cli',
      args: [],
      timeoutMilliseconds: 1_000,
    })
    spawned.emitClose(null, 'SIGTERM')

    await expect(outcome).resolves.toStrictEqual({
      kind: 'exited',
      exitCode: null,
      signal: 'SIGTERM',
      standardOutput: '',
      standardError: '',
    })
  })

  it('kills the process and reports a timeout', async () => {
    const { client, spawned } = createClient()

    const outcome = client.run({
      command: 'ai-cli',
      args: [],
      timeoutMilliseconds: 5,
    })

    await expect(outcome).resolves.toStrictEqual({
      kind: 'timed-out',
      timeoutMilliseconds: 5,
    })
    expect(spawned.killCount).toBe(1)
  })

  it('ignores a close event that arrives after a timeout', async () => {
    const { client, spawned } = createClient()

    const outcome = client.run({
      command: 'ai-cli',
      args: [],
      timeoutMilliseconds: 5,
    })
    await expect(outcome).resolves.toMatchObject({ kind: 'timed-out' })
    spawned.emitClose(0, null)

    await expect(outcome).resolves.toMatchObject({ kind: 'timed-out' })
  })

  it('kills the process when standard output exceeds the capture bound', async () => {
    const { client, spawned } = createClient()

    const outcome = client.run({
      command: 'ai-cli',
      args: [],
      timeoutMilliseconds: 1_000,
    })
    spawned.emitStandardOutput(Buffer.alloc(1024 * 1024 + 1))

    await expect(outcome).resolves.toStrictEqual({
      kind: 'output-exceeded',
      stream: 'standardOutput',
    })
    expect(spawned.killCount).toBe(1)
  })

  it('kills the process when standard error exceeds the capture bound', async () => {
    const { client, spawned } = createClient()

    const outcome = client.run({
      command: 'ai-cli',
      args: [],
      timeoutMilliseconds: 1_000,
    })
    spawned.emitStandardError(Buffer.alloc(1024 * 1024 + 1))

    await expect(outcome).resolves.toStrictEqual({
      kind: 'output-exceeded',
      stream: 'standardError',
    })
    expect(spawned.killCount).toBe(1)
  })

  it('reports a spawn failure when spawning throws an error', async () => {
    const { client } = createClient({ failSpawn: new SpawnFailure('cannot spawn') })

    await expect(
      client.run({ command: 'ai-cli', args: [], timeoutMilliseconds: 1_000 }),
    ).resolves.toStrictEqual({ kind: 'spawn-failed', reason: 'cannot spawn' })
  })

  it('reports a spawn failure when spawning throws a non-error value', async () => {
    const { client } = createClient({ failSpawn: 'boom' })

    await expect(
      client.run({ command: 'ai-cli', args: [], timeoutMilliseconds: 1_000 }),
    ).resolves.toStrictEqual({ kind: 'spawn-failed', reason: 'boom' })
  })

  it('reports a spawn failure when the process emits an error', async () => {
    const { client, spawned } = createClient()

    const outcome = client.run({
      command: 'ai-cli',
      args: [],
      timeoutMilliseconds: 1_000,
    })
    spawned.emitSpawnError(new SpawnFailure('ENOENT'))

    await expect(outcome).resolves.toStrictEqual({ kind: 'spawn-failed', reason: 'ENOENT' })
  })

  it('reports a spawn failure when standard input cannot be written', async () => {
    const { client } = createClient({ failStandardInput: new StandardInputFailure('closed pipe') })

    await expect(
      client.run({
        command: 'ai-cli',
        args: [],
        timeoutMilliseconds: 1_000,
        standardInput: 'prompt',
      }),
    ).resolves.toStrictEqual({ kind: 'spawn-failed', reason: 'closed pipe' })
  })
})
