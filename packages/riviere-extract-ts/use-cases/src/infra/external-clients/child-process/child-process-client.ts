import { spawnSync } from 'node:child_process'

const MAX_OUTPUT_BYTES = 1024 * 1024
const PROBE_ARGUMENT = '--version'
const PROBE_TIMEOUT_MILLISECONDS = 5000

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
  run(input: ChildProcessRunInput): ChildProcessRunResult
  probe(command: string): ChildProcessProbeResult
}

/** @riviere-role external-client-service */
export function createChildProcessClient(): ChildProcessClient {
  return { run: runChildProcess, probe: probeChildProcess }
}

function runChildProcess(input: ChildProcessRunInput): ChildProcessRunResult {
  const result = spawnSync(input.command, [...input.arguments], {
    shell: false,
    env: process.env,
    encoding: 'utf8',
    timeout: input.timeoutSeconds * 1000,
    killSignal: 'SIGKILL',
    maxBuffer: MAX_OUTPUT_BYTES,
    ...(input.stdin === undefined ? {} : { input: input.stdin }),
  })

  if (result.error !== undefined) return failureFromProcessError(result.error)
  if (result.status === null) {
    return {
      kind: 'spawn-failure',
      reason: `Command terminated by signal '${result.signal}'.`,
    }
  }
  return {
    kind: 'completed',
    exitCode: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  }
}

function failureFromProcessError(error: Error): ChildProcessRunResult {
  const processError: NodeJS.ErrnoException = error
  if (processError.code === 'ETIMEDOUT') return { kind: 'timed-out' }
  if (processError.code === 'ENOBUFS') {
    return { kind: 'output-truncated', limitBytes: MAX_OUTPUT_BYTES }
  }
  return { kind: 'spawn-failure', reason: error.message }
}

function probeChildProcess(command: string): ChildProcessProbeResult {
  const result = spawnSync(command, [PROBE_ARGUMENT], {
    shell: false,
    env: process.env,
    stdio: 'ignore',
    timeout: PROBE_TIMEOUT_MILLISECONDS,
    killSignal: 'SIGKILL',
  })
  if (result.error !== undefined) return { kind: 'unavailable', reason: result.error.message }
  return { kind: 'available' }
}
