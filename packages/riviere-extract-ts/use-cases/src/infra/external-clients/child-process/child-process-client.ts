import { spawn } from 'node:child_process'
import { accessSync, constants } from 'node:fs'
import { delimiter, join } from 'node:path'

const MAX_OUTPUT_BYTES = 1024 * 1024

/** @riviere-role external-client-model */
export interface ChildProcessRunInput {
  readonly command: string
  readonly arguments: readonly string[]
  readonly stdin: string | undefined
  readonly timeoutSeconds: number
}

/** @riviere-role external-client-model */
export type ChildProcessRunResult =
  | Readonly<{ kind: 'completed'; exitCode: number; stdout: string; stderr: string }>
  | Readonly<{ kind: 'timed-out' }>
  | Readonly<{ kind: 'output-truncated'; limitBytes: number }>
  | Readonly<{ kind: 'spawn-failure'; reason: string }>

/** @riviere-role external-client-model */
export type ChildProcessProbeResult =
  | Readonly<{ kind: 'available' }>
  | Readonly<{ kind: 'unavailable'; reason: string }>

/** @riviere-role external-client-model */
export interface ChildProcessClient {
  run(input: ChildProcessRunInput): Promise<ChildProcessRunResult>
  lookupExecutable(command: string): ChildProcessProbeResult
}

type ChildProcessRunState = {
  settled: boolean
  outputBytes: number
  stdout: string
  stderr: string
  timeout: NodeJS.Timeout | undefined
}

/** @riviere-role external-client-service */
export function createChildProcessClient(): ChildProcessClient {
  return { run: runChildProcess, lookupExecutable }
}

function runChildProcess(input: ChildProcessRunInput): Promise<ChildProcessRunResult> {
  return new Promise((resolve) => {
    const child = spawn(input.command, [...input.arguments], {
      shell: false,
      env: process.env,
      stdio: 'pipe',
    })
    const state: ChildProcessRunState = {
      settled: false,
      outputBytes: 0,
      stdout: '',
      stderr: '',
      timeout: undefined,
    }

    const finish = (result: ChildProcessRunResult): void => {
      if (state.settled) return
      state.settled = true
      clearTimeout(state.timeout)
      resolve(result)
    }

    const capture = (chunk: Buffer, stream: 'stdout' | 'stderr'): void => {
      state.outputBytes += chunk.byteLength
      if (state.outputBytes > MAX_OUTPUT_BYTES) {
        child.kill('SIGKILL')
        finish({ kind: 'output-truncated', limitBytes: MAX_OUTPUT_BYTES })
        return
      }
      state[stream] += chunk.toString('utf8')
    }

    child.stdout.on('data', (chunk: Buffer) => {
      capture(chunk, 'stdout')
    })
    child.stderr.on('data', (chunk: Buffer) => {
      capture(chunk, 'stderr')
    })
    child.stdin.on('error', () => undefined)
    child.on('error', (error) => {
      finish({ kind: 'spawn-failure', reason: error.message })
    })
    child.on('close', (exitCode) => {
      if (exitCode === null) {
        finish({ kind: 'spawn-failure', reason: 'Command terminated by a signal.' })
        return
      }
      finish({ kind: 'completed', exitCode, stdout: state.stdout, stderr: state.stderr })
    })
    state.timeout = setTimeout(() => {
      child.kill('SIGKILL')
      finish({ kind: 'timed-out' })
    }, input.timeoutSeconds * 1000)

    if (input.stdin === undefined) {
      child.stdin.end()
      return
    }
    child.stdin.end(input.stdin)
  })
}

function lookupExecutable(command: string): ChildProcessProbeResult {
  if (command.includes('/') || command.includes('\\')) {
    return isExecutable(command)
      ? { kind: 'available' }
      : { kind: 'unavailable', reason: `Executable not found at '${command}'.` }
  }
  const path = process.env['PATH']
  if (path === undefined) return { kind: 'unavailable', reason: 'PATH is not configured.' }
  const found = path
    .split(delimiter)
    .filter((directory) => directory.length > 0)
    .some((directory) => isExecutable(join(directory, command)))
  if (found) return { kind: 'available' }
  return { kind: 'unavailable', reason: `Executable '${command}' was not found on PATH.` }
}

function isExecutable(candidatePath: string): boolean {
  try {
    accessSync(candidatePath, constants.X_OK)
    return true
  } catch {
    return false
  }
}
