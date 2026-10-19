import { accessSync, constants, statSync } from 'node:fs'
import { delimiter, join } from 'node:path'

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
  | Readonly<{ readonly kind: 'unsupported'; readonly command: string; readonly reason: string }>
  | Readonly<{ readonly kind: 'not-found'; readonly command: string }>

const DEFAULT_WINDOWS_PATH_EXTENSIONS = ['.COM', '.EXE', '.BAT', '.CMD'] as const
const WINDOWS_BATCH_EXTENSIONS = ['.BAT', '.CMD'] as const

/** @riviere-role external-client-service */
export class ExecutableResolver {
  constructor(
    private readonly resolutionEnvironment: ChildProcessResolutionEnvironmentReader = currentResolutionEnvironment,
  ) {}

  resolveExecutable(command: string): ChildProcessExecutableResolution {
    if (command.trim().length === 0) return { kind: 'invalid-command', command }
    const environment = this.resolutionEnvironment()
    const executableNames = candidateExecutableNames(command, environment)
    if (command.includes('/') || command.includes('\\')) {
      return resolveExecutablePath(executableNames, command, environment)
    }
    if (environment.searchPath === undefined) return notFound(command)
    const searchDirectories = environment.searchPath
      .split(delimiter)
      .filter((directory) => directory.length > 0)
    for (const directory of searchDirectories) {
      const resolved = resolveExecutablePath(
        executableNames.map((executableName) => join(directory, executableName)),
        command,
        environment,
      )
      if (resolved.kind !== 'not-found') return resolved
    }
    return notFound(command)
  }
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
  environment: ChildProcessResolutionEnvironment,
): ChildProcessExecutableResolution {
  for (const candidate of candidates) {
    if (!executableAt(candidate)) continue
    if (environment.platform === 'win32' && isWindowsBatch(candidate)) {
      return {
        kind: 'unsupported',
        command,
        reason: `Expected an executable command. Got '${candidate}'. Context: Windows batch shims require a shell, which is disabled`,
      }
    }
    return { kind: 'resolved', executablePath: candidate }
  }
  return notFound(command)
}

function isWindowsBatch(candidate: string): boolean {
  const upperCaseCandidate = candidate.toUpperCase()
  return WINDOWS_BATCH_EXTENSIONS.some((extension) => upperCaseCandidate.endsWith(extension))
}

function executableAt(candidate: string): boolean {
  try {
    return statSync(candidate).isFile() && hasExecutePermission(candidate)
  } catch {
    return false
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

function notFound(command: string): ChildProcessExecutableResolution {
  return { kind: 'not-found', command }
}
