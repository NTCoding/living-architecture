import { accessSync, constants } from 'node:fs'
import { delimiter, join } from 'node:path'
import { spawn } from 'node:child_process'

/** @riviere-role external-client-model */
export type ChildProcessOutput = Readonly<{
  readonly text: string
  readonly truncated: boolean
}>

/** @riviere-role external-client-model */
type ChildProcessRunInputBase = Readonly<{
  readonly command: string
  readonly args: readonly string[]
  readonly timeoutMilliseconds: number
  readonly maximumOutputBytes: number
}>

/** @riviere-role external-client-model */
export type ChildProcessRunInput = ChildProcessRunInputBase &
  (
    | Readonly<{ readonly kind: 'pipe-stdin'; readonly stdin: string }>
    | Readonly<{ readonly kind: 'no-stdin' }>
  )

/** @riviere-role external-client-model */
export type ChildProcessRunResult =
  | Readonly<{
      readonly kind: 'completed'
      readonly exitCode: number
      readonly stdout: ChildProcessOutput
      readonly stderr: ChildProcessOutput
    }>
  | Readonly<{
      readonly kind: 'timed-out'
      readonly stdout: ChildProcessOutput
      readonly stderr: ChildProcessOutput
    }>
  | Readonly<{
      readonly kind: 'spawn-failed'
      readonly reason: string
    }>

/** @riviere-role external-client-model */
export type ChildProcessExecutableResolution =
  | Readonly<{ readonly kind: 'resolved'; readonly executablePath: string }>
  | Readonly<{ readonly kind: 'not-found'; readonly command: string }>

class BoundedOutput {
  private readonly chunks: Buffer[] = []
  private collectedBytes = 0
  private truncated = false

  constructor(private readonly maximumBytes: number) {}

  collect(chunk: Buffer): void {
    const remainingBytes = this.maximumBytes - this.collectedBytes
    if (remainingBytes <= 0) {
      this.truncated = true
      return
    }
    if (chunk.length > remainingBytes) {
      this.truncated = true
      this.chunks.push(chunk.subarray(0, remainingBytes))
      this.collectedBytes += remainingBytes
      return
    }
    this.chunks.push(chunk)
    this.collectedBytes += chunk.length
  }

  snapshot(): ChildProcessOutput {
    return {
      text: Buffer.concat(this.chunks).toString('utf8'),
      truncated: this.truncated,
    }
  }
}

/** @riviere-role external-client-service */
export class ChildProcessClient {
  resolveExecutable(command: string): ChildProcessExecutableResolution {
    if (command.includes('/') || command.includes('\\')) {
      return this.executableAt(command)
        ? { kind: 'resolved', executablePath: command }
        : notFound(command)
    }
    const searchPath = process.env['PATH']
    if (searchPath === undefined) return notFound(command)
    for (const directory of searchPath.split(delimiter)) {
      const candidate = join(directory, command)
      if (this.executableAt(candidate)) return { kind: 'resolved', executablePath: candidate }
    }
    return notFound(command)
  }

  run(input: ChildProcessRunInput): Promise<ChildProcessRunResult> {
    return new Promise((resolve) => {
      const child = this.spawnChild(input, resolve)
      if (child === undefined) return
      const stdout = new BoundedOutput(input.maximumOutputBytes)
      const stderr = new BoundedOutput(input.maximumOutputBytes)
      const runState = { settled: false }
      const finish = (result: ChildProcessRunResult): void => {
        if (runState.settled) return
        runState.settled = true
        resolve(result)
      }
      const timer = setTimeout(() => {
        child.kill('SIGKILL')
        finish({ kind: 'timed-out', stdout: stdout.snapshot(), stderr: stderr.snapshot() })
      }, input.timeoutMilliseconds)
      child.stdout?.on('data', (chunk: Buffer) => stdout.collect(chunk))
      child.stderr?.on('data', (chunk: Buffer) => stderr.collect(chunk))
      child.stdin?.on('error', () => undefined)
      child.on('error', (error) => finish({ kind: 'spawn-failed', reason: String(error) }))
      child.on('close', (exitCode, signal) => {
        clearTimeout(timer)
        if (exitCode === null) {
          finish({
            kind: 'spawn-failed',
            reason: `Process terminated by signal '${String(signal)}'`,
          })
          return
        }
        finish({
          kind: 'completed',
          exitCode,
          stdout: stdout.snapshot(),
          stderr: stderr.snapshot(),
        })
      })
      child.stdin?.end(input.kind === 'pipe-stdin' ? input.stdin : undefined)
    })
  }

  private executableAt(candidate: string): boolean {
    try {
      accessSync(candidate, constants.X_OK)
      return true
    } catch {
      return false
    }
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
      resolve({ kind: 'spawn-failed', reason: String(error) })
      return undefined
    }
  }
}

function notFound(command: string): ChildProcessExecutableResolution {
  return { kind: 'not-found', command }
}
