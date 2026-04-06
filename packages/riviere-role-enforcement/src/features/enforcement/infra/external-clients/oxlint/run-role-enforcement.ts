import {
  readdirSync, realpathSync, rmSync, writeFileSync 
} from 'node:fs'
import type { PathLike } from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { performance } from 'node:perf_hooks'
import { fileURLToPath } from 'node:url'
import { minimatch } from 'minimatch'
import type { RoleEnforcementResult } from '../../../domain/role-enforcement-builder'
import { createOxlintConfig } from '../../../domain/create-oxlint-config'

/** @riviere-role external-client-model */
export interface RoleEnforcementRunResult {
  durationMs: number
  exitCode: number
  stderr: string
  stdout: string
}

/** @riviere-role external-client-error */
export class RoleEnforcementExecutionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RoleEnforcementExecutionError'
  }
}

interface RoleEnforcementRuntimeDeps {
  now: () => number
  readdirSync: (
    rootDir: PathLike,
    options: {
      recursive: true
      withFileTypes: true
    },
  ) => Array<{
    isFile: () => boolean
    name: string
    parentPath: string
  }>
  realpathSync: (filePath: PathLike) => string
  rmSync: (filePath: string, options: { force: true }) => void
  spawnSync: (
    command: string,
    args: string[],
    options: {
      cwd: string
      encoding: 'utf8'
    },
  ) => {
    error?: Error
    status: number | null
    stderr: string
    stdout: string
  }
  writeFileSync: (filePath: string, contents: string) => void
}

const defaultRuntimeDeps: RoleEnforcementRuntimeDeps = {
  now: () => performance.now(),
  readdirSync: (rootDir, options) => readdirSync(rootDir, options),
  realpathSync,
  rmSync,
  spawnSync,
  writeFileSync,
}

/** @riviere-role external-client-service */
export function runRoleEnforcement(
  config: RoleEnforcementResult,
  configDir: string,
  runtimeDeps: RoleEnforcementRuntimeDeps = defaultRuntimeDeps,
): RoleEnforcementRunResult {
  const currentDir = path.dirname(fileURLToPath(import.meta.url))
  const canonicalConfigDir = runtimeDeps.realpathSync(configDir)
  const pluginPath = path.resolve(
    currentDir,
    '..',
    '..',
    '..',
    '..',
    '..',
    '..',
    'role-enforcement-plugin.mjs',
  )
  const oxlintBinaryPath = path.resolve(
    currentDir,
    '..',
    '..',
    '..',
    '..',
    '..',
    '..',
    '..',
    '..',
    'node_modules',
    '.bin',
    'oxlint',
  )
  const oxlintConfigPath = path.join(
    configDir,
    `.oxlintrc.role-enforcement.${process.pid}.${Date.now()}.json`,
  )
  const configDisplayPath = 'role-enforcement.config.ts'
  const oxlintConfig = createOxlintConfig(config, canonicalConfigDir, configDisplayPath, pluginPath)
  const lintTargets = resolveLintTargets(
    canonicalConfigDir,
    config.include,
    config.ignorePatterns,
    runtimeDeps.readdirSync,
  )

  runtimeDeps.writeFileSync(oxlintConfigPath, JSON.stringify(oxlintConfig, null, 2))

  const start = runtimeDeps.now()
  const commandResult = runtimeDeps.spawnSync(
    oxlintBinaryPath,
    ['-c', oxlintConfigPath, ...lintTargets],
    {
      cwd: configDir,
      encoding: 'utf8',
    },
  )
  const durationMs = runtimeDeps.now() - start

  runtimeDeps.rmSync(oxlintConfigPath, { force: true })

  if (commandResult.error !== undefined) {
    throw new RoleEnforcementExecutionError(commandResult.error.message)
  }

  return {
    durationMs,
    exitCode: commandResult.status ?? 1,
    stderr: commandResult.stderr,
    stdout: commandResult.stdout,
  }
}

function resolveLintTargets(
  configDir: string,
  includePatterns: readonly string[],
  ignorePatterns: readonly string[],
  readDirectory: RoleEnforcementRuntimeDeps['readdirSync'],
): string[] {
  const scanDirs = includePatterns.map((pattern) => extractScanDir(pattern))
  const files = scanDirs.flatMap((scanDir) => walkFiles(configDir, scanDir, readDirectory))
  return files
    .filter((filePath) => matchesAny(filePath, includePatterns))
    .filter((filePath) => !matchesAny(filePath, ignorePatterns))
}

function extractScanDir(includePattern: string): string {
  const segments = includePattern.split('/')
  const staticSegments: string[] = []
  for (const segment of segments) {
    if (segment.includes('*') || segment.includes('{') || segment.includes('?')) {
      break
    }
    staticSegments.push(segment)
  }

  return staticSegments.join('/')
}

function walkFiles(
  rootDir: string,
  scanDir: string,
  readDirectory: RoleEnforcementRuntimeDeps['readdirSync'],
): string[] {
  const absoluteScanDir = path.join(rootDir, scanDir)
  const entries = readDirectory(absoluteScanDir, {
    recursive: true,
    withFileTypes: true,
  })
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) =>
      normalizePath(
        path.join(scanDir, path.relative(absoluteScanDir, path.join(entry.parentPath, entry.name))),
      ),
    )
}

function matchesAny(filePath: string, patterns: readonly string[]): boolean {
  return patterns.some((pattern) => minimatch(filePath, pattern, { dot: true }))
}

function normalizePath(value: string): string {
  return value.replaceAll('\\', '/')
}

/** @riviere-role external-client-service */
export function formatRoleEnforcementFailure(error: unknown): string {
  if (error instanceof RoleEnforcementExecutionError) {
    return error.message
  }

  return error instanceof Error ? error.message : 'Unknown role enforcement failure.'
}
