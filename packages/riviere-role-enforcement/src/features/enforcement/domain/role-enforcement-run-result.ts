/** @riviere-role value-object */
export interface RoleEnforcementRunResult {
  durationMs: number
  exitCode: number
  stderr: string
  stdout: string
}

/** @riviere-role domain-error */
export class RoleEnforcementExecutionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RoleEnforcementExecutionError'
  }
}
