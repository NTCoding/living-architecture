/** @riviere-role domain-error */
export class InvalidLocationConfigurationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidLocationConfigurationError'
  }
}

/** @riviere-role domain-error */
export class InvalidRoleDefinitionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidRoleDefinitionError'
  }
}

/** @riviere-role domain-error */
export class RepeatedInheritedImportError extends Error {
  constructor(location: string, scope: string, importName: string) {
    super(`Location '${location}' repeats inherited ${scope} import '${importName}'.`)
    this.name = 'RepeatedInheritedImportError'
  }
}

/** @riviere-role domain-error */
export class InvalidRoleFilteredImportError extends Error {
  constructor() {
    super('A role-filtered import must name a location.')
    this.name = 'InvalidRoleFilteredImportError'
  }
}
