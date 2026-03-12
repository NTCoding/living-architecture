import {
  readdirSync, realpathSync, rmSync, writeFileSync 
} from 'node:fs'
import type { PathLike } from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { performance } from 'node:perf_hooks'
import { fileURLToPath } from 'node:url'
import { minimatch } from 'minimatch'
import { loadRoleEnforcementConfig } from '../config/load-role-enforcement-config'
import { RoleEnforcementConfigError } from '../config/role-enforcement-config-error'
import { createOxlintConfig } from './create-oxlint-config'

export interface RoleEnforcementRunResult {
  durationMs: number
  exitCode: number
  stderr: string
  stdout: string
}

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

export function runRoleEnforcement(
  configPath: string,
  runtimeDeps: RoleEnforcementRuntimeDeps = defaultRuntimeDeps,
): RoleEnforcementRunResult {
  const loadedConfig = loadRoleEnforcementConfig(configPath)
  const currentDir = path.dirname(fileURLToPath(import.meta.url))
  const canonicalConfigDir = runtimeDeps.realpathSync(loadedConfig.configDir)
  const pluginPath = path.resolve(currentDir, '..', '..', 'role-enforcement-plugin.mjs')
  const oxlintBinaryPath = path.resolve(
    currentDir,
    '..',
    '..',
    '..',
    '..',
    'node_modules',
    '.bin',
    'oxlint',
  )
  const oxlintConfigPath = path.join(
    loadedConfig.configDir,
    `.oxlintrc.role-enforcement.${process.pid}.${Date.now()}.json`,
  )
  const oxlintConfig = createOxlintConfig(
    loadedConfig.config,
    canonicalConfigDir,
    loadedConfig.configPath,
    pluginPath,
  )
  const lintTargets = resolveLintTargets(
    canonicalConfigDir,
    loadedConfig.config.include,
    loadedConfig.config.ignorePatterns,
    runtimeDeps.readdirSync,
  )

  runtimeDeps.writeFileSync(oxlintConfigPath, JSON.stringify(oxlintConfig, null, 2))

  const start = runtimeDeps.now()
  const commandResult = runtimeDeps.spawnSync(
    oxlintBinaryPath,
    ['-c', oxlintConfigPath, ...lintTargets],
    {
      cwd: loadedConfig.configDir,
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
  includePatterns: string[],
  ignorePatterns: string[],
  readDirectory: RoleEnforcementRuntimeDeps['readdirSync'],
): string[] {
  return walkFiles(configDir, readDirectory)
    .filter((filePath) => matchesAny(filePath, includePatterns))
    .filter((filePath) => !matchesAny(filePath, ignorePatterns))
}

function walkFiles(
  rootDir: string,
  readDirectory: RoleEnforcementRuntimeDeps['readdirSync'],
): string[] {
  const entries = readDirectory(rootDir, {
    recursive: true,
    withFileTypes: true,
  })
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => normalizePath(path.relative(rootDir, path.join(entry.parentPath, entry.name))))
}

function matchesAny(filePath: string, patterns: string[]): boolean {
  return patterns.some((pattern) => minimatch(filePath, pattern, { dot: true }))
}

function normalizePath(value: string): string {
  return value.replaceAll('\\', '/')
}

export function formatRoleEnforcementFailure(error: unknown): string {
  if (
    error instanceof RoleEnforcementConfigError ||
    error instanceof RoleEnforcementExecutionError
  ) {
    return error.message
  }

  return error instanceof Error ? error.message : 'Unknown role enforcement failure.'
}
