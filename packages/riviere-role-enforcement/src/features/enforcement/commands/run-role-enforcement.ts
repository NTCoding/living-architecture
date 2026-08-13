import { RoleEnforcementProjectRepository } from '../data-access/role-enforcement/role-enforcement-project-repository'
import { PackageFilterError } from '../domain/filter-config-by-package'
import type { RoleEnforcementRunner } from '../domain/ports/role-enforcement-runner'
import { RoleEnforcementExecutionError } from '../domain/role-enforcement-execution-error'
import type { RunRoleEnforcementInput } from './run-role-enforcement-input'
import type { RunRoleEnforcementResult } from './run-role-enforcement-result'

interface RunRoleEnforcementDependencies {
  now: () => number
  projectRepository: RoleEnforcementProjectRepository
  runner: RoleEnforcementRunner
}

/** @riviere-role command-use-case */
export class RunRoleEnforcement {
  private readonly deps: RunRoleEnforcementDependencies

  constructor(deps: RunRoleEnforcementDependencies) {
    this.deps = deps
  }

  execute(input: RunRoleEnforcementInput): RunRoleEnforcementResult {
    const start = this.deps.now()
    try {
      const project = this.deps.projectRepository.load(input.configModule, input.configDir)
      const adapterResult = project.execute(this.deps.runner, input.packageFilter)
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
