import { spawn } from 'node:child_process'
import {
  boundedOutputSnapshot,
  collectBoundedOutput,
  emptyBoundedOutput,
  type ChildProcessOutput,
} from './bounded-output'
import { ExecutableResolver, type ChildProcessExecutableResolution } from './executable-resolution'
import { isBenignStdinWriteError, unresolvedReason } from './child-process-failure'

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
      readonly kind: 'terminated-by-signal'
      readonly signal: string
      readonly stdout: ChildProcessOutput
      readonly stderr: ChildProcessOutput
    }>
  | Readonly<{
      readonly kind: 'stdin-failed'
      readonly reason: string
    }>
  | Readonly<{
      readonly kind: 'spawn-failed'
      readonly reason: string
    }>

/** @riviere-role external-client-service */
export class ChildProcessClient {
  constructor(private readonly executableResolver: ExecutableResolver = new ExecutableResolver()) {}

  resolveExecutable(command: string): ChildProcessExecutableResolution {
    return this.executableResolver.resolveExecutable(command)
  }

  run(input: ChildProcessRunInput): Promise<ChildProcessRunResult> {
    const resolution = this.resolveExecutable(input.command)
    if (resolution.kind !== 'resolved') {
      return Promise.resolve({ kind: 'spawn-failed', reason: unresolvedReason(resolution) })
    }
    return new Promise((resolve) => {
      const child = this.spawnChild(resolution.executablePath, input, resolve)
      if (child === undefined) return
      const runState = {
        settled: false,
        stdout: emptyBoundedOutput(),
        stderr: emptyBoundedOutput(),
      }
      const finish = (result: ChildProcessRunResult): void => {
        if (runState.settled) return
        runState.settled = true
        clearTimeout(timer)
        resolve(result)
      }
      const timer = setTimeout(() => {
        child.kill('SIGKILL')
        finish({
          kind: 'timed-out',
          stdout: boundedOutputSnapshot(runState.stdout),
          stderr: boundedOutputSnapshot(runState.stderr),
        })
      }, input.timeoutMilliseconds)
      child.stdout?.on('data', (chunk: Buffer) => {
        runState.stdout = collectBoundedOutput(runState.stdout, chunk, input.maximumOutputBytes)
      })
      child.stderr?.on('data', (chunk: Buffer) => {
        runState.stderr = collectBoundedOutput(runState.stderr, chunk, input.maximumOutputBytes)
      })
      child.stdin?.on('error', (error: Error) => {
        if (isBenignStdinWriteError(error)) return
        child.kill('SIGKILL')
        finish({ kind: 'stdin-failed', reason: String(error) })
      })
      child.on('error', (error) => finish({ kind: 'spawn-failed', reason: String(error) }))
      child.on('close', (exitCode, signal) => {
        if (exitCode === null) {
          finish({
            kind: 'terminated-by-signal',
            signal: String(signal),
            stdout: boundedOutputSnapshot(runState.stdout),
            stderr: boundedOutputSnapshot(runState.stderr),
          })
          return
        }
        finish({
          kind: 'completed',
          exitCode,
          stdout: boundedOutputSnapshot(runState.stdout),
          stderr: boundedOutputSnapshot(runState.stderr),
        })
      })
      child.stdin?.end(input.kind === 'pipe-stdin' ? input.stdin : undefined)
    })
  }

  private spawnChild(
    executablePath: string,
    input: ChildProcessRunInput,
    resolve: (result: ChildProcessRunResult) => void,
  ): ReturnType<typeof spawn> | undefined {
    try {
      return spawn(executablePath, [...input.args], {
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

export { ExecutableResolver, windowsPathExtensions } from './executable-resolution'
export { isBenignStdinWriteError } from './child-process-failure'
export type { ChildProcessExecutableResolution } from './executable-resolution'
export { boundedOutputSnapshot, collectBoundedOutput, emptyBoundedOutput } from './bounded-output'
export type { ChildProcessOutput } from './bounded-output'
