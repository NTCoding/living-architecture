/** @riviere-role domain-error */
export class ModuleContextsMismatchError extends Error {
  constructor() {
    super('Module contexts must match resolved configuration exactly')
    this.name = 'ModuleContextsMismatchError'
  }
}

/** @riviere-role domain-error */
export class MissingModuleContextError extends Error {
  constructor(moduleName: string) {
    super(`Missing context for module '${moduleName}'`)
    this.name = 'MissingModuleContextError'
  }
}

/** @riviere-role domain-error */
export class MissingModuleSourceError extends Error {
  constructor(moduleName: string) {
    super(`Missing source for module '${moduleName}'`)
    this.name = 'MissingModuleSourceError'
  }
}

/** @riviere-role domain-error */
export class MissingResolvedTypeNameError extends Error {
  constructor() {
    super('Expected resolved type name')
    this.name = 'MissingResolvedTypeNameError'
  }
}

/** @riviere-role domain-error */
export class MissingInterfaceTypeNameError extends Error {
  constructor() {
    super('Expected interface resolution type name')
    this.name = 'MissingInterfaceTypeNameError'
  }
}

/** @riviere-role domain-error */
export class InvalidWorkflowStageError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidWorkflowStageError'
  }
}
