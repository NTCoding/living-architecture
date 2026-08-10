import type { RoleEnforcementResult } from '../role-enforcement-builder'

/** @riviere-role domain-port */
export interface RoleEnforcementRunnerInput {
  config: RoleEnforcementResult
  configDir: string
  lintTargets: readonly string[]
}

/** @riviere-role domain-port */
export interface RoleEnforcementRunnerResult {
  exitCode: number
  stderr: string
  stdout: string
}

/** @riviere-role domain-port */
export type RoleEnforcementRunner = (
  input: RoleEnforcementRunnerInput,
) => RoleEnforcementRunnerResult
