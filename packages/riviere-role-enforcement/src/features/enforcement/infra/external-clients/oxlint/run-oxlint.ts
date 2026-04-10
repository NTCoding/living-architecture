import {
  rmSync, writeFileSync 
} from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { RoleEnforcementExecutionError } from '../../../domain/role-enforcement-execution-error'
import type { OxlintConfig } from './create-oxlint-config'

interface OxlintAdapterDeps {
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

interface RunOxlintInputs {
  oxlintConfig: OxlintConfig
  configDir: string
  lintTargets: readonly string[]
  deps?: OxlintAdapterDeps
}

interface RunOxlintAdapterResult {
  exitCode: number
  stderr: string
  stdout: string
}

const defaultAdapterDeps: OxlintAdapterDeps = {
  rmSync,
  spawnSync,
  writeFileSync,
}

/** @riviere-role external-client-service */
export function runOxlint({
  oxlintConfig,
  configDir,
  lintTargets,
  deps = defaultAdapterDeps,
}: RunOxlintInputs): RunOxlintAdapterResult {
  const oxlintBinaryPath = resolveOxlintBinaryPath()
  const oxlintConfigPath = path.join(
    configDir,
    `.oxlintrc.role-enforcement.${process.pid}.${Date.now()}.json`,
  )

  deps.writeFileSync(oxlintConfigPath, JSON.stringify(oxlintConfig, null, 2))

  try {
    const commandResult = deps.spawnSync(
      oxlintBinaryPath,
      ['-c', oxlintConfigPath, ...lintTargets],
      {
        cwd: configDir,
        encoding: 'utf8',
      },
    )

    if (commandResult.error !== undefined) {
      throw new RoleEnforcementExecutionError(commandResult.error.message)
    }

    return {
      exitCode: commandResult.status ?? 1,
      stderr: commandResult.stderr,
      stdout: commandResult.stdout,
    }
  } finally {
    deps.rmSync(oxlintConfigPath, { force: true })
  }
}

function resolveOxlintBinaryPath(): string {
  const currentDir = path.dirname(fileURLToPath(import.meta.url))
  return path.resolve(
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
}
