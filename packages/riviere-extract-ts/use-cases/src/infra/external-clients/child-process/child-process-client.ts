import { spawn } from 'node:child_process'

/** @riviere-role external-client-model */
export type ChildProcessRunInput = Readonly<{
  readonly command: string
  readonly args: readonly string[]
  readonly stdin: string | undefined
  readonly timeoutMilliseconds: number
  readonly maximumOutputBytes: number
}>

/** @riviere-role external-client-model */
export type ChildProcessOutput = Readonly<{
  readonly stdout: string
  readonly stderr: string
  readonly outputTruncated: boolean
}>

/** @riviere-role external-client-model */
export type ChildProcessRunResult =
  | Readonly<{
      readonly kind: 'completed'
      readonly exitCode: number
      readonly stdout: string
      readonly stderr: string
      readonly outputTruncated: boolean
    }>
  | Readonly<{
      readonly kind: 'timed-out'
      readonly stdout: string
      readonly stderr: string
      readonly outputTruncated: boolean
    }>
  | Readonly<{
      readonly kind: 'spawn-failed'
      readonly reason: string
    }>

/** @riviere-role external-client-model */
export type ChildProcessCommandAvailability =
  | Readonly<{
      readonly kind: 'available'
      readonly command: string
    }>
  | Readonly<{
      readonly kind: 'unavailable'
      readonly command: string
      readonly reason: string
    }>

const AVAILABILITY_TIMEOUT_MILLISECONDS = 5_000
const AVAILABILITY_MAXIMUM_OUTPUT_BYTES = 4_096

class BoundedOutput {
  private readonly stdoutChunks: Buffer[] = []
  private readonly stderrChunks: Buffer[] = []
  private collectedBytes = 0
  private truncated = false

  constructor(private readonly maximumBytes: number) {}

  collectStdout(chunk: Buffer): void {
    this.collect(this.stdoutChunks, chunk)
  }

  collectStderr(chunk: Buffer): void {
    this.collect(this.stderrChunks, chunk)
  }

  snapshot(): ChildProcessOutput {
    return {
      stdout: Buffer.concat(this.stdoutChunks).toString('utf8'),
      stderr: Buffer.concat(this.stderrChunks).toString('utf8'),
      outputTruncated: this.truncated,
    }
  }

  private collect(chunks: Buffer[], chunk: Buffer): void {
    const remainingBytes = this.maximumBytes - this.collectedBytes
    if (remainingBytes <= 0) {
      this.truncated = true
      return
    }
    if (chunk.length > remainingBytes) {
      this.truncated = true
      chunks.push(chunk.subarray(0, remainingBytes))
      this.collectedBytes += remainingBytes
      return
    }
    chunks.push(chunk)
    this.collectedBytes += chunk.length
  }
}

/** @riviere-role external-client-service */
export class ChildProcessClient {
  async checkCommand(command: string): Promise<ChildProcessCommandAvailability> {
    const result = await this.run({
      command,
      args: ['--version'],
      stdin: undefined,
      timeoutMilliseconds: AVAILABILITY_TIMEOUT_MILLISECONDS,
      maximumOutputBytes: AVAILABILITY_MAXIMUM_OUTPUT_BYTES,
    })
    if (result.kind === 'spawn-failed') {
      return { kind: 'unavailable', command, reason: result.reason }
    }
    return { kind: 'available', command }
  }

  run(input: ChildProcessRunInput): Promise<ChildProcessRunResult> {
    return new Promise((resolve) => {
      const child = this.spawnChild(input, resolve)
      if (child === undefined) return
      const output = new BoundedOutput(input.maximumOutputBytes)
      const runState = { settled: false }
      const finish = (result: ChildProcessRunResult): void => {
        if (runState.settled) return
        runState.settled = true
        resolve(result)
      }
      const timer = setTimeout(() => {
        child.kill('SIGKILL')
        finish({ kind: 'timed-out', ...output.snapshot() })
      }, input.timeoutMilliseconds)
      child.stdout?.on('data', (chunk: Buffer) => output.collectStdout(chunk))
      child.stderr?.on('data', (chunk: Buffer) => output.collectStderr(chunk))
      child.on('error', (error) => finish({ kind: 'spawn-failed', reason: error.message }))
      child.on('close', (exitCode, signal) => {
        clearTimeout(timer)
        if (exitCode === null) {
          finish({
            kind: 'spawn-failed',
            reason: `Process terminated by signal '${String(signal)}'`,
          })
          return
        }
        finish({ kind: 'completed', exitCode, ...output.snapshot() })
      })
      child.stdin?.end(input.stdin)
    })
  }

  private spawnChild(
    input: ChildProcessRunInput,
    resolve: (result: ChildProcessRunResult) => void,
  ): ReturnType<typeof spawn> | undefined {
    try {
      return spawn(input.command, [...input.args], {
        shell: false,
        env: process.env,
        stdio: ['pipe', 'pipe', 'pipe'],
      })
    } catch (error) {
      resolve({
        kind: 'spawn-failed',
        reason: String(error),
      })
      return undefined
    }
  }
}
