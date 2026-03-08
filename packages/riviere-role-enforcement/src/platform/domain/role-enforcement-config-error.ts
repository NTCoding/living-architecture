export class RoleEnforcementConfigError extends TypeError {
  constructor(message: string) {
    super(message)
    this.name = 'RoleEnforcementConfigError'
  }
}
