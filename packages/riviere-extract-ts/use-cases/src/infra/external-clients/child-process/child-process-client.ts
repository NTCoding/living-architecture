import { accessSync, constants, statSync } from 'node:fs'
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

type ChildProcessResolutionEnvironment = Readonly<{
  readonly platform: NodeJS.Platform
  readonly searchPath: string | undefined
  readonly pathExtensions: readonly string[]
}>

type ChildProcessResolutionEnvironmentReader = () => ChildProcessResolutionEnvironment

/** @riviere-role external-client-model */
export type ChildProcessExecutableResolution =
  | Readonly<{ readonly kind: 'resolved'; readonly executablePath: string }>
  | Readonly<{ readonly kind: 'invalid-command'; readonly command: string }>
  | Readonly<{ readonly kind: 'not-found'; readonly command: string }>

const DEFAULT_WINDOWS_PATH_EXTENSIONS = ['.COM', '.EXE', '.BAT', '.CMD'] as const

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
  constructor(
    private readonly resolutionEnvironment: ChildProcessResolutionEnvironmentReader = currentResolutionEnvironment,
  ) {}

  resolveExecutable(command: string): ChildProcessExecutableResolution {
    if (command.trim().length === 0) return { kind: 'invalid-command', command }
    const environment = this.resolutionEnvironment()
    const executableNames = candidateExecutableNames(command, environment)
    if (command.includes('/') || command.includes('\\')) {
      return resolveExecutablePath(executableNames, command)
    }
    if (environment.searchPath === undefined) return notFound(command)
    const searchDirectories = environment.searchPath
      .split(delimiter)
      .filter((directory) => directory.length > 0)
    for (const directory of searchDirectories) {
      const resolved = resolveExecutablePath(
        executableNames.map((executableName) => join(directory, executableName)),
        command,
      )
      if (resolved.kind === 'resolved') return resolved
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
      child.stdin?.on('error', (error: Error) => {
        if (isBenignStdinWriteError(error)) return
        finish({ kind: 'stdin-failed', reason: String(error) })
      })
      child.on('error', (error) => finish({ kind: 'spawn-failed', reason: String(error) }))
      child.on('close', (exitCode, signal) => {
        clearTimeout(timer)
        if (exitCode === null) {
          finish({
            kind: 'terminated-by-signal',
            signal: String(signal),
            stdout: stdout.snapshot(),
            stderr: stderr.snapshot(),
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

function hasExecutePermission(candidate: string): boolean {
  try {
    accessSync(candidate, constants.X_OK)
    return true
  } catch {
    return false
  }
}

/** @riviere-role external-client-service */
export function isBenignStdinWriteError(error: Error): boolean {
  return 'code' in error && (error.code === 'EPIPE' || error.code === 'ERR_STREAM_DESTROYED')
}

function currentResolutionEnvironment(): ChildProcessResolutionEnvironment {
  return {
    platform: process.platform,
    searchPath: process.env['PATH'],
    pathExtensions: windowsPathExtensions(process.platform, process.env['PATHEXT']),
  }
}

/** @riviere-role external-client-service */
export function windowsPathExtensions(
  platform: NodeJS.Platform,
  pathExtensions: string | undefined,
): readonly string[] {
  if (platform !== 'win32') return []
  if (pathExtensions === undefined) return DEFAULT_WINDOWS_PATH_EXTENSIONS
  return pathExtensions
    .split(';')
    .map((extension) => extension.trim())
    .filter((extension) => extension.length > 0)
    .map((extension) => (extension.startsWith('.') ? extension : `.${extension}`))
}

function candidateExecutableNames(
  command: string,
  environment: ChildProcessResolutionEnvironment,
): readonly string[] {
  if (environment.platform !== 'win32') return [command]
  return [command, ...environment.pathExtensions.map((extension) => `${command}${extension}`)]
}

function resolveExecutablePath(
  candidates: readonly string[],
  command: string,
): ChildProcessExecutableResolution {
  for (const candidate of candidates) {
    if (executableAt(candidate)) return { kind: 'resolved', executablePath: candidate }
  }
  return notFound(command)
}

function executableAt(candidate: string): boolean {
  try {
    return statSync(candidate).isFile() && hasExecutePermission(candidate)
  } catch {
    return false
  }
}

function notFound(command: string): ChildProcessExecutableResolution {
  return { kind: 'not-found', command }
}
