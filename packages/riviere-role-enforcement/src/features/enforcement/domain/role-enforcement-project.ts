import { minimatch } from 'minimatch'
import { filterConfigByPackage } from './filter-config-by-package'
import type {
  RoleEnforcementRunner,
  RoleEnforcementRunnerResult,
} from './ports/role-enforcement-runner'
import type { RoleEnforcementResult } from './role-enforcement-builder'

/** @riviere-role aggregate */
export class RoleEnforcementProject {
  constructor(
    private readonly config: RoleEnforcementResult,
    private readonly configDir: string,
    private readonly lintTargets: readonly string[],
  ) {}

  execute(runner: RoleEnforcementRunner, packageFilter?: string): RoleEnforcementRunnerResult {
    if (packageFilter === undefined) {
      return runner({
        config: this.config,
        configDir: this.configDir,
        lintTargets: this.lintTargets,
      })
    }

    const config = filterConfigByPackage(this.config, packageFilter)
    return runner({
      config,
      configDir: this.configDir,
      lintTargets: selectLintTargets(this.lintTargets, config),
    })
  }
}

function selectLintTargets(
  lintTargets: readonly string[],
  config: RoleEnforcementResult,
): string[] {
  return lintTargets
    .filter((filePath) => matchesAny(filePath, config.include))
    .filter((filePath) => !matchesAny(filePath, config.ignorePatterns))
}

function matchesAny(filePath: string, patterns: readonly string[]): boolean {
  return patterns.some((pattern) => minimatch(filePath, pattern, { dot: true }))
}
