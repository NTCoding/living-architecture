/** @riviere-role domain-error */
export class RoleEnforcementExecutionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RoleEnforcementExecutionError'
  }
}
