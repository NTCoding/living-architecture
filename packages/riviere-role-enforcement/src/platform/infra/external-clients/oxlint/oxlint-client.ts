import { spawnSync } from 'node:child_process'
import { rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { findFileUp } from '../filesystem/find-file-up'
import type { OxlintClient } from './oxlint-config'
import { OxlintExecutionError } from './oxlint-execution-error'

interface OxlintClientDependencies {
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

const defaultDependencies: OxlintClientDependencies = {
  rmSync,
  spawnSync,
  writeFileSync,
}

/** @riviere-role external-client-service */
export function runOxlint(
  input: Parameters<OxlintClient>[0],
  dependencies: OxlintClientDependencies = defaultDependencies,
): ReturnType<OxlintClient> {
  const oxlintBinaryPath = resolveOxlintBinaryPath()
  const oxlintConfigPath = path.join(
    input.configDir,
    `.oxlintrc.role-enforcement.${process.pid}.${Date.now()}.json`,
  )

  dependencies.writeFileSync(oxlintConfigPath, JSON.stringify(input.config, null, 2))

  try {
    const commandResult = dependencies.spawnSync(
      oxlintBinaryPath,
      ['-c', oxlintConfigPath, ...input.lintTargets],
      {
        cwd: input.configDir,
        encoding: 'utf8',
      },
    )

    if (commandResult.error !== undefined) {
      throw new OxlintExecutionError(commandResult.error.message)
    }

    return {
      exitCode: commandResult.status ?? 1,
      stderr: commandResult.stderr,
      stdout: commandResult.stdout,
    }
  } finally {
    dependencies.rmSync(oxlintConfigPath, { force: true })
  }
}

function resolveOxlintBinaryPath(): string {
  const startDirectory = path.dirname(fileURLToPath(import.meta.url))
  const found = findFileUp(startDirectory, path.join('node_modules', '.bin', 'oxlint'))
  if (found === undefined) {
    throw new OxlintExecutionError('Cannot find oxlint binary in node_modules')
  }
  return found
}
