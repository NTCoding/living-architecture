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

export class ComponentNotFoundError extends Error {
  readonly componentId: string
  readonly suggestions: string[]

  constructor(componentId: string, suggestions: string[] = []) {
    const baseMessage = `Source component '${componentId}' not found`
    const message =
      suggestions.length > 0
        ? `${baseMessage}. Did you mean: ${suggestions.join(', ')}?`
        : baseMessage
    super(message)
    this.name = 'ComponentNotFoundError'
    this.componentId = componentId
    this.suggestions = suggestions
  }
}

export class InvalidEnrichmentTargetError extends Error {
  readonly componentId: string
  readonly componentType: string

  constructor(componentId: string, componentType: string) {
    super(`Only DomainOp components can be enriched. '${componentId}' is type '${componentType}'`)
    this.name = 'InvalidEnrichmentTargetError'
    this.componentId = componentId
    this.componentType = componentType
  }
}

export class CustomTypeAlreadyDefinedError extends Error {
  readonly typeName: string

  constructor(typeName: string) {
    super(`Custom type '${typeName}' already defined`)
    this.name = 'CustomTypeAlreadyDefinedError'
    this.typeName = typeName
  }
}

export class MissingRequiredPropertiesError extends Error {
  readonly customTypeName: string
  readonly missingKeys: string[]

  constructor(customTypeName: string, missingKeys: string[]) {
    super(`Missing required properties for '${customTypeName}': ${missingKeys.join(', ')}`)
    this.name = 'MissingRequiredPropertiesError'
    this.customTypeName = customTypeName
    this.missingKeys = missingKeys
  }
}

export class InvalidGraphError extends Error {
  constructor(reason: string) {
    super(`Invalid graph: ${reason}`)
    this.name = 'InvalidGraphError'
  }
}

export class MissingSourcesError extends Error {
  constructor() {
    super('At least one source required')
    this.name = 'MissingSourcesError'
  }
}

export class MissingDomainsError extends Error {
  constructor() {
    super('At least one domain required')
    this.name = 'MissingDomainsError'
  }
}

export class BuildValidationError extends Error {
  readonly validationMessages: string[]

  constructor(messages: string[]) {
    super(`Validation failed: ${messages.join('; ')}`)
    this.name = 'BuildValidationError'
    this.validationMessages = messages
  }
}
