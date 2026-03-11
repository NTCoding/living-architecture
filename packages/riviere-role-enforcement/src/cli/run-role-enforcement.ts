import {
  readdirSync, realpathSync, rmSync, writeFileSync 
} from 'node:fs'
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

export function runRoleEnforcement(configPath: string): RoleEnforcementRunResult {
  const loadedConfig = loadRoleEnforcementConfig(configPath)
  const currentDir = path.dirname(fileURLToPath(import.meta.url))
  const canonicalConfigDir = realpathSync(loadedConfig.configDir)
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
  )

  writeFileSync(oxlintConfigPath, JSON.stringify(oxlintConfig, null, 2))

  const start = performance.now()
  const commandResult = spawnSync(oxlintBinaryPath, ['-c', oxlintConfigPath, ...lintTargets], {
    cwd: loadedConfig.configDir,
    encoding: 'utf8',
  })
  const durationMs = performance.now() - start

  rmSync(oxlintConfigPath, { force: true })

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
): string[] {
  return walkFiles(configDir)
    .filter((filePath) => matchesAny(filePath, includePatterns))
    .filter((filePath) => !matchesAny(filePath, ignorePatterns))
}

function walkFiles(rootDir: string): string[] {
  const entries = readdirSync(rootDir, {
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
