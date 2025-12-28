export class DuplicateDomainError extends Error {
  readonly domainName: string

  constructor(domainName: string) {
    super(`Domain '${domainName}' already exists`)
    this.name = 'DuplicateDomainError'
    this.domainName = domainName
  }
}

export class DomainNotFoundError extends Error {
  readonly domainName: string

  constructor(domainName: string) {
    super(`Domain '${domainName}' does not exist`)
    this.name = 'DomainNotFoundError'
    this.domainName = domainName
  }
}

export class CustomTypeNotFoundError extends Error {
  readonly customTypeName: string
  readonly definedTypes: string[]

  constructor(customTypeName: string, definedTypes: string[]) {
    const suffix =
      definedTypes.length === 0
        ? 'No custom types have been defined.'
        : `Defined types: ${definedTypes.join(', ')}`
    super(`Custom type '${customTypeName}' not defined. ${suffix}`)
    this.name = 'CustomTypeNotFoundError'
    this.customTypeName = customTypeName
    this.definedTypes = definedTypes
  }
}

export class DuplicateComponentError extends Error {
  readonly componentId: string

  constructor(componentId: string) {
    super(`Component with ID '${componentId}' already exists`)
    this.name = 'DuplicateComponentError'
    this.componentId = componentId
  }
}
