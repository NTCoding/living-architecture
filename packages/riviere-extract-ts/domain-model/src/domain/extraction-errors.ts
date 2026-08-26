/** @riviere-role domain-error */
export class ModuleContextsMismatchError extends Error {
  constructor() {
    super('Module contexts must match resolved configuration exactly')
    this.name = 'ModuleContextsMismatchError'
  }
}

/** @riviere-role domain-error */
export class MissingModuleSourceError extends Error {
  constructor(moduleName: string) {
    super(`Missing source for module '${moduleName}'`)
    this.name = 'MissingModuleSourceError'
  }
}
