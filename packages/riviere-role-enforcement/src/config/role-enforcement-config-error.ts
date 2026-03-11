export class RoleEnforcementConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RoleEnforcementConfigError'
  }
}
