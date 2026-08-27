import type { RoleEnforcementConfiguration } from '../role-enforcement-builder'

/**
 * @riviere-role domain-port
 * @riviere-role-justification This is the input contract for the current role enforcement capability. It carries RoleEnforcementProject state to the runner and does not load state into the aggregate.
 */
export interface RoleEnforcementRunnerInput {
  config: RoleEnforcementConfiguration
  configDir: string
  lintTargets: readonly string[]
}

/**
 * @riviere-role domain-port
 * @riviere-role-justification This is the result contract for the current role enforcement capability. It reports execution output and does not restore RoleEnforcementProject state.
 */
export interface RoleEnforcementRunnerResult {
  exitCode: number
  stderr: string
  stdout: string
}

/**
 * @riviere-role domain-port
 * @riviere-role-justification RoleEnforcementProject invokes this capability to perform current role enforcement with state already supplied by its repository. The result is execution output, not restored aggregate state.
 */
export type RoleEnforcementRunner = (
  input: RoleEnforcementRunnerInput,
) => RoleEnforcementRunnerResult
