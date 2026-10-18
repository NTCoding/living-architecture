import { spawn } from 'node:child_process'

const maximumCapturedBytes = 1024 * 1024

type SpawnProcessInput = Readonly<{
  command: string
  args: readonly string[]
  shell: false
  environment: NodeJS.ProcessEnv
}>

type ExitStatus = Readonly<{
  exitCode: number | null
  signal: string | null
}>

type SpawnedProcess = Readonly<{
  writeStandardInput: (contents: string | undefined) => void
  onStandardOutput: (listener: (chunk: Buffer) => void) => void
  onStandardError: (listener: (chunk: Buffer) => void) => void
  onSpawnError: (listener: (error: Error) => void) => void
  onClose: (listener: (status: ExitStatus) => void) => void
  kill: () => void
}>

type SpawnProcess = (input: SpawnProcessInput) => SpawnedProcess

type SpawnChildProcessInput = Readonly<{
  command: string
  args: readonly string[]
  timeoutMilliseconds: number
  standardInput?: string
}>

type ChildProcessOutcome =
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

type CapturedOutput = Readonly<{ chunks: readonly Buffer[]; byteCount: number }>

const emptyCapturedOutput: CapturedOutput = { chunks: [], byteCount: 0 }

function appendChunk(captured: CapturedOutput, chunk: Buffer): CapturedOutput {
  return { chunks: [...captured.chunks, chunk], byteCount: captured.byteCount + chunk.byteLength }
}

function isWithinCaptureBound(captured: CapturedOutput): boolean {
  return captured.byteCount <= maximumCapturedBytes
}

function capturedText(captured: CapturedOutput): string {
  return Buffer.concat(captured.chunks).toString('utf8')
}

function describeFailure(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function ignoreStreamError(): void {
  return undefined
}

function spawnNodeProcess(input: SpawnProcessInput): SpawnedProcess {
  const child = spawn(input.command, [...input.args], {
    env: input.environment,
    shell: input.shell,
  })
  child.stdin.on('error', ignoreStreamError)
  return {
    kill: () => {
      child.kill('SIGKILL')
    },
    onClose: (listener) => {
      child.on('close', (exitCode, signal) => listener({ exitCode, signal }))
    },
    onSpawnError: (listener) => {
      child.on('error', listener)
    },
    onStandardError: (listener) => {
      child.stderr.on('data', listener)
    },
    onStandardOutput: (listener) => {
      child.stdout.on('data', listener)
    },
    writeStandardInput: (contents) => {
      if (contents === undefined) {
        child.stdin.end()
        return
      }
      child.stdin.end(contents)
    },
  }
}

class ChildProcessRun {
  private standardOutput = emptyCapturedOutput
  private standardError = emptyCapturedOutput
  private isSettled = false
  private timeout: ReturnType<typeof setTimeout> | undefined

  constructor(
    private readonly input: SpawnChildProcessInput,
    private readonly spawnProcess: SpawnProcess,
    private readonly resolveOutcome: (outcome: ChildProcessOutcome) => void,
  ) {}

  start(): void {
    const spawnedProcess = this.spawn()
    if (spawnedProcess === undefined) return
    this.timeout = setTimeout(
      () => this.abortForTimeout(spawnedProcess),
      this.input.timeoutMilliseconds,
    )
    spawnedProcess.onSpawnError((error) =>
      this.settle({ kind: 'spawn-failed', reason: error.message }),
    )
    spawnedProcess.onStandardOutput((chunk) => this.captureStandardOutput(spawnedProcess, chunk))
    spawnedProcess.onStandardError((chunk) => this.captureStandardError(spawnedProcess, chunk))
    spawnedProcess.onClose((status) =>
      this.settle({
        kind: 'exited',
        exitCode: status.exitCode,
        signal: status.signal,
        standardOutput: capturedText(this.standardOutput),
        standardError: capturedText(this.standardError),
      }),
    )
    this.writeStandardInput(spawnedProcess)
  }

  private spawn(): SpawnedProcess | undefined {
    try {
      return this.spawnProcess({
        command: this.input.command,
        args: this.input.args,
        shell: false,
        environment: process.env,
      })
    } catch (error) {
      this.settle({ kind: 'spawn-failed', reason: describeFailure(error) })
      return undefined
    }
  }

  private abortForTimeout(spawnedProcess: SpawnedProcess): void {
    spawnedProcess.kill()
    this.settle({ kind: 'timed-out', timeoutMilliseconds: this.input.timeoutMilliseconds })
  }

  private captureStandardOutput(spawnedProcess: SpawnedProcess, chunk: Buffer): void {
    this.standardOutput = appendChunk(this.standardOutput, chunk)
    if (isWithinCaptureBound(this.standardOutput)) return
    spawnedProcess.kill()
    this.settle({ kind: 'output-exceeded', stream: 'standardOutput' })
  }

  private captureStandardError(spawnedProcess: SpawnedProcess, chunk: Buffer): void {
    this.standardError = appendChunk(this.standardError, chunk)
    if (isWithinCaptureBound(this.standardError)) return
    spawnedProcess.kill()
    this.settle({ kind: 'output-exceeded', stream: 'standardError' })
  }

  private writeStandardInput(spawnedProcess: SpawnedProcess): void {
    try {
      spawnedProcess.writeStandardInput(this.input.standardInput)
    } catch (error) {
      this.settle({ kind: 'spawn-failed', reason: describeFailure(error) })
    }
  }

  private settle(outcome: ChildProcessOutcome): void {
    if (this.isSettled) return
    this.isSettled = true
    if (this.timeout !== undefined) clearTimeout(this.timeout)
    this.resolveOutcome(outcome)
  }
}

/** @riviere-role external-client-service */
export class ChildProcessClient {
  constructor(private readonly spawnProcess: SpawnProcess = spawnNodeProcess) {}

  run(input: SpawnChildProcessInput): Promise<ChildProcessOutcome> {
    return new Promise((resolve) => {
      new ChildProcessRun(input, this.spawnProcess, resolve).start()
    })
  }
}
