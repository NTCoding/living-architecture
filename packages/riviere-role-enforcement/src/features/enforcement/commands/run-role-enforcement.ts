import {
  readdirSync, realpathSync 
} from 'node:fs'
import path from 'node:path'
import { performance } from 'node:perf_hooks'
import { fileURLToPath } from 'node:url'
import { findFileUp } from '../domain/find-file-up'
import { PackageFilterError } from '../domain/filter-config-by-package'
import { resolveLintTargets } from '../domain/resolve-lint-targets'
import { RoleEnforcementExecutionError } from '../domain/role-enforcement-execution-error'
import {
  readConfig as defaultReadConfig,
  readConfigForPackage as defaultReadConfigForPackage,
} from '../infra/external-clients/oxlint/config-reader'
import { createOxlintConfig } from '../infra/external-clients/oxlint/create-oxlint-config'
import { runOxlint } from '../infra/external-clients/oxlint/run-oxlint'
import type { RunRoleEnforcementInput } from './run-role-enforcement-input'
import type { RunRoleEnforcementResult } from './run-role-enforcement-result'

type ReadDirectoryFn = Parameters<typeof resolveLintTargets>[3]

const defaultRunRoleEnforcementDeps: {
  now: () => number
  readdirSync: ReadDirectoryFn
  realpathSync: (filePath: string) => string
  oxlintAdapter: typeof runOxlint
  readConfig: typeof defaultReadConfig
  readConfigForPackage: typeof defaultReadConfigForPackage
} = {
  now: () => performance.now(),
  readdirSync: (rootDir, options) => readdirSync(rootDir, options),
  realpathSync: (filePath) => realpathSync(filePath),
  oxlintAdapter: runOxlint,
  readConfig: defaultReadConfig,
  readConfigForPackage: defaultReadConfigForPackage,
}

/** @riviere-role command-use-case */
export class RunRoleEnforcement {
  private readonly deps: typeof defaultRunRoleEnforcementDeps

  constructor(deps: Partial<typeof defaultRunRoleEnforcementDeps> = {}) {
    this.deps = {
      ...defaultRunRoleEnforcementDeps,
      ...deps,
    }
  }

  execute(input: RunRoleEnforcementInput): RunRoleEnforcementResult {
    const start = this.deps.now()
    try {
      const config =
        input.packageFilter === undefined
          ? this.deps.readConfig(input.configModule)
          : this.deps.readConfigForPackage(input.configModule, input.packageFilter)

      const canonicalConfigDir = this.deps.realpathSync(input.configDir)
      const pluginPath = resolvePluginPath()
      const configDisplayPath = 'role-enforcement.config.ts'
      const oxlintConfig = createOxlintConfig(
        config,
        canonicalConfigDir,
        configDisplayPath,
        pluginPath,
      )
      const lintTargets = resolveLintTargets(
        canonicalConfigDir,
        config.include,
        config.ignorePatterns,
        this.deps.readdirSync,
      )

      const adapterResult = this.deps.oxlintAdapter({
        oxlintConfig,
        configDir: canonicalConfigDir,
        lintTargets,
      })
      return {
        durationMs: this.deps.now() - start,
        exitCode: adapterResult.exitCode,
        stderr: adapterResult.stderr,
        stdout: adapterResult.stdout,
      }
    } catch (error) {
      if (error instanceof RoleEnforcementExecutionError || error instanceof PackageFilterError) {
        return {
          durationMs: this.deps.now() - start,
          exitCode: 1,
          stderr: `${error.message}\n`,
          stdout: '',
        }
      }
      throw error
    }
  }
}

function resolvePluginPath(): string {
  const startDir = path.dirname(fileURLToPath(import.meta.url))
  const found = findFileUp(startDir, 'role-enforcement-plugin.mjs')
  if (found === undefined) {
    throw new RoleEnforcementExecutionError('Cannot find role-enforcement-plugin.mjs')
  }
  return found
}
