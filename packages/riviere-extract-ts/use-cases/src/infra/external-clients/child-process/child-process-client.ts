import { spawn } from 'node:child_process'
import type { Writable } from 'node:stream'

const DEFAULT_MAX_CAPTURED_BYTES = 1_048_576
const AVAILABILITY_TIMEOUT_MILLISECONDS = 5_000

type CapturedProcessOutput = Readonly<{
  text: string
  truncated: boolean
}>

type ExecutableAvailability =
  | Readonly<{ kind: 'available' }>
  | Readonly<{ kind: 'unavailable'; reason: string }>

type ChildProcessRequest = Readonly<{
  command: string
  args: readonly string[]
  stdin?: string
  timeoutMilliseconds: number
}>

type ChildProcessResult =
  | Readonly<{
      kind: 'exited'
      exitCode: number
      stdout: CapturedProcessOutput
      stderr: CapturedProcessOutput
    }>
  | Readonly<{
      kind: 'timed-out'
      timeoutMilliseconds: number
      stdout: CapturedProcessOutput
      stderr: CapturedProcessOutput
    }>
  | Readonly<{
      kind: 'failed'
      reason: string
      stdout: CapturedProcessOutput
      stderr: CapturedProcessOutput
    }>

type NodeChildProcessClientOptions = Readonly<{
  maxCapturedBytes?: number
  platform?: NodeJS.Platform
}>

/** @riviere-role external-client-model */
export interface ChildProcessClient {
  checkExecutableAvailability(command: string): Promise<ExecutableAvailability>
  execute(request: ChildProcessRequest): Promise<ChildProcessResult>
}

class BoundedOutputCapture {
  private readonly chunks: Buffer[] = []
  private capturedBytes = 0
  private truncated = false

  constructor(private readonly maxCapturedBytes: number) {}

  append(chunk: Buffer): void {
    const remainingBytes = this.maxCapturedBytes - this.capturedBytes
    if (remainingBytes <= 0) {
      this.truncated = true
      return
    }
    const accepted = chunk.subarray(0, remainingBytes)
    this.chunks.push(accepted)
    this.capturedBytes += accepted.length
    if (accepted.length < chunk.length) this.truncated = true
  }

  result(): CapturedProcessOutput {
    return {
      text: Buffer.concat(this.chunks).toString('utf8'),
      truncated: this.truncated,
    }
  }
}

/** @riviere-role external-client-service */
export class NodeChildProcessClient implements ChildProcessClient {
  private readonly maxCapturedBytes: number
  private readonly platform: NodeJS.Platform

  constructor(options: NodeChildProcessClientOptions = {}) {
    this.maxCapturedBytes = options.maxCapturedBytes ?? DEFAULT_MAX_CAPTURED_BYTES
    this.platform = options.platform ?? process.platform
  }

  async checkExecutableAvailability(command: string): Promise<ExecutableAvailability> {
    const locator = this.platform === 'win32' ? 'where' : 'which'
    const result = await this.execute({
      command: locator,
      args: [command],
      timeoutMilliseconds: AVAILABILITY_TIMEOUT_MILLISECONDS,
    })
    if (result.kind === 'exited' && result.exitCode === 0) return { kind: 'available' }
    return { kind: 'unavailable', reason: `'${command}' is not installed or not in PATH` }
  }

  execute(request: ChildProcessRequest): Promise<ChildProcessResult> {
    return new Promise((resolveResult) => {
      const child = spawn(request.command, [...request.args], {
        shell: false,
        env: process.env,
        stdio: ['pipe', 'pipe', 'pipe'],
      })
      const stdout = new BoundedOutputCapture(this.maxCapturedBytes)
      const stderr = new BoundedOutputCapture(this.maxCapturedBytes)
      const state = { settled: false, timedOut: false }
      const finish = (result: ChildProcessResult): void => {
        if (state.settled) return
        state.settled = true
        clearTimeout(timeout)
        resolveResult(result)
      }
      const timeout = setTimeout(() => {
        state.timedOut = true
        child.kill('SIGKILL')
      }, request.timeoutMilliseconds)
      child.stdout.on('data', (chunk: Buffer) => stdout.append(chunk))
      child.stderr.on('data', (chunk: Buffer) => stderr.append(chunk))
      child.on('error', (error) =>
        finish({
          kind: 'failed',
          reason: error.message,
          stdout: stdout.result(),
          stderr: stderr.result(),
        }),
      )
      child.on('close', (exitCode) =>
        finish(
          closeResult(
            exitCode,
            state.timedOut,
            request.timeoutMilliseconds,
            stdout.result(),
            stderr.result(),
          ),
        ),
      )
      writeStdin(child.stdin, request.stdin)
    })
  }
}

function closeResult(
  exitCode: number | null,
  timedOut: boolean,
  timeoutMilliseconds: number,
  stdout: CapturedProcessOutput,
  stderr: CapturedProcessOutput,
): ChildProcessResult {
  if (timedOut) return { kind: 'timed-out', timeoutMilliseconds, stdout, stderr }
  if (exitCode === null)
    return { kind: 'failed', reason: 'Process ended without an exit code', stdout, stderr }
  return { kind: 'exited', exitCode, stdout, stderr }
}

function writeStdin(stdin: Writable, content: string | undefined): void {
  stdin.end(content)
}

export type {
  CapturedProcessOutput,
  ChildProcessRequest,
  ChildProcessResult,
  ExecutableAvailability,
  NodeChildProcessClientOptions,
}
