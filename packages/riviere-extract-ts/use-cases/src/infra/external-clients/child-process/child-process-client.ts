import { spawn } from 'node:child_process'

const MAX_OUTPUT_BYTES = 1024 * 1024
const PROBE_ARGUMENT = '--version'

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
  | Readonly<{ kind: 'timeout' }>
  | Readonly<{ kind: 'output-limit-exceeded'; limitBytes: number }>
  | Readonly<{ kind: 'invocation-failure'; reason: string }>

/** @riviere-role external-client-model */
export type ChildProcessProbeResult =
  | Readonly<{ kind: 'available' }>
  | Readonly<{ kind: 'unavailable'; reason: string }>

/** @riviere-role external-client-model */
export interface ChildProcessClient {
  run(input: ChildProcessRunInput): Promise<ChildProcessRunResult>
  probe(command: string): Promise<ChildProcessProbeResult>
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
  return { run: runChildProcess, probe: probeChildProcess }
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
        finish({ kind: 'output-limit-exceeded', limitBytes: MAX_OUTPUT_BYTES })
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
      finish({ kind: 'invocation-failure', reason: error.message })
    })
    child.on('close', (exitCode) => {
      if (exitCode === null) {
        finish({ kind: 'invocation-failure', reason: 'Command terminated by a signal.' })
        return
      }
      finish({ kind: 'completed', exitCode, stdout: state.stdout, stderr: state.stderr })
    })
    state.timeout = setTimeout(() => {
      child.kill('SIGKILL')
      finish({ kind: 'timeout' })
    }, input.timeoutSeconds * 1000)

    if (input.stdin === undefined) {
      child.stdin.end()
      return
    }
    child.stdin.end(input.stdin)
  })
}

function probeChildProcess(command: string): Promise<ChildProcessProbeResult> {
  return new Promise((resolve) => {
    const child = spawn(command, [PROBE_ARGUMENT], {
      shell: false,
      env: process.env,
      stdio: 'ignore',
    })
    const finish = (result: ChildProcessProbeResult): void => {
      resolve(result)
    }
    child.once('spawn', () => {
      child.kill('SIGKILL')
      finish({ kind: 'available' })
    })
    child.once('error', (error) => {
      finish({ kind: 'unavailable', reason: error.message })
    })
  })
}
