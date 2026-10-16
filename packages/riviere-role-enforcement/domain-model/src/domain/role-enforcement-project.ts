import { PackageConfigFilter } from './package-config-filter'
import type { RoleEnforcementRunner } from './ports/role-enforcement-runner'
import type { RoleEnforcementConfiguration } from './role-enforcement-builder'

/** @riviere-role aggregate */
export class RoleEnforcementProject {
  constructor(
    private readonly config: RoleEnforcementConfiguration,
    private readonly configDir: string,
    private readonly lintTargets: readonly string[],
    private readonly packageConfigFilter: PackageConfigFilter,
  ) {}

  execute(
    runner: RoleEnforcementRunner,
    packageFilter?: string,
  ): { readonly exitCode: number; readonly stderr: string; readonly stdout: string } {
    if (packageFilter === undefined) {
      return runner({
        config: this.config,
        configDir: this.configDir,
        lintTargets: this.lintTargets,
      })
    }

    const config = this.packageConfigFilter.forPackage(this.config, packageFilter)
    return runner({
      config,
      configDir: this.configDir,
      lintTargets: this.packageConfigFilter.selectLintTargets(this.lintTargets, config),
    })
  }
}
