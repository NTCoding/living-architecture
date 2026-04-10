import {
  readdirSync, realpathSync 
} from 'node:fs'
import path from 'node:path'
import { performance } from 'node:perf_hooks'
import { fileURLToPath } from 'node:url'
import { resolveLintTargets } from '../domain/resolve-lint-targets'
import type { RoleEnforcementResult } from '../domain/role-enforcement-builder'
import type { RoleEnforcementRunResult } from '../domain/role-enforcement-run-result'
import { createOxlintConfig } from '../infra/external-clients/oxlint/create-oxlint-config'
import { runOxlint } from '../infra/external-clients/oxlint/run-oxlint'

type ReadDirectoryFn = Parameters<typeof resolveLintTargets>[3]

interface RunRoleEnforcementDeps {
  now: () => number
  readdirSync: ReadDirectoryFn
  realpathSync: (filePath: string) => string
  oxlintAdapter: typeof runOxlint
}

const defaultRunRoleEnforcementDeps: RunRoleEnforcementDeps = {
  now: () => performance.now(),
  readdirSync: (rootDir, options) => readdirSync(rootDir, options),
  realpathSync: (filePath) => realpathSync(filePath),
  oxlintAdapter: runOxlint,
}

/** @riviere-role command-orchestrator */
export function runRoleEnforcement(
  config: RoleEnforcementResult,
  configDir: string,
  deps: RunRoleEnforcementDeps = defaultRunRoleEnforcementDeps,
): RoleEnforcementRunResult {
  const canonicalConfigDir = deps.realpathSync(configDir)
  const pluginPath = resolvePluginPath()
  const configDisplayPath = 'role-enforcement.config.ts'
  const oxlintConfig = createOxlintConfig(config, canonicalConfigDir, configDisplayPath, pluginPath)
  const lintTargets = resolveLintTargets(
    canonicalConfigDir,
    config.include,
    config.ignorePatterns,
    deps.readdirSync,
  )

  const start = deps.now()
  const adapterResult = deps.oxlintAdapter({
    oxlintConfig,
    configDir,
    lintTargets,
  })
  const durationMs = deps.now() - start

  return {
    durationMs,
    exitCode: adapterResult.exitCode,
    stderr: adapterResult.stderr,
    stdout: adapterResult.stdout,
  }
}

function resolvePluginPath(): string {
  const currentDir = path.dirname(fileURLToPath(import.meta.url))
  return path.resolve(currentDir, '..', '..', '..', '..', 'role-enforcement-plugin.mjs')
}
