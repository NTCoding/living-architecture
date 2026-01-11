export class InvalidPackageJsonError extends Error {
  constructor(reason: string) {
    super(`Invalid package.json: ${reason}`)
    this.name = 'InvalidPackageJsonError'
  }
}

export class InvalidCustomPropertyError extends Error {
  readonly property: string

  constructor(property: string) {
    super(`Invalid custom property format: ${property}. Expected 'key:value'`)
    this.name = 'InvalidCustomPropertyError'
    this.property = property
  }
}

export class MissingRequiredOptionError extends Error {
  readonly optionName: string
  readonly componentType: string

  constructor(optionName: string, componentType: string) {
    super(`--${optionName} is required for ${componentType} component`)
    this.name = 'MissingRequiredOptionError'
    this.optionName = optionName
    this.componentType = componentType
  }
}

export class InvalidDomainJsonError extends Error {
  readonly value: string

  constructor(value: string) {
    super(`Invalid domain JSON: ${value}`)
    this.name = 'InvalidDomainJsonError'
    this.value = value
  }
}

export class InvalidComponentTypeError extends Error {
  readonly value: string
  readonly validTypes: readonly string[]

  constructor(value: string, validTypes: readonly string[]) {
    super(`Expected valid ComponentType. Got: ${value}. Valid types: ${validTypes.join(', ')}`)
    this.name = 'InvalidComponentTypeError'
    this.value = value
    this.validTypes = validTypes
  }
}

export class InvalidNormalizedComponentTypeError extends Error {
  readonly value: string
  readonly validTypes: string[]

  constructor(value: string, validTypes: string[]) {
    super(`Invalid component type: ${value}. Valid types: ${validTypes.join(', ')}`)
    this.name = 'InvalidNormalizedComponentTypeError'
    this.value = value
    this.validTypes = validTypes
  }
}

export class ConfigSchemaValidationError extends Error {
  constructor(source: string, details: string) {
    super(`Invalid extended config in '${source}': ${details}`)
    this.name = 'ConfigSchemaValidationError'
  }
}

export class InvalidConfigFormatError extends Error {
  readonly source: string
  readonly preview: string

  constructor(source: string, preview: string) {
    super(
      `Invalid extended config format in '${source}'. ` +
        `Expected object with 'modules' array or top-level component rules. Got: ${preview}`,
    )
    this.name = 'InvalidConfigFormatError'
    this.source = source
    this.preview = preview
  }
}

export class PackageResolveError extends Error {
  readonly packageName: string

  constructor(packageName: string) {
    super(
      `Cannot resolve package '${packageName}'. ` +
        `Ensure the package is installed in node_modules.`,
    )
    this.name = 'PackageResolveError'
    this.packageName = packageName
  }
}

export class ConfigFileNotFoundError extends Error {
  readonly source: string
  readonly filePath: string

  constructor(source: string, filePath: string) {
    super(`Cannot resolve extends reference '${source}'. File not found: ${filePath}`)
    this.name = 'ConfigFileNotFoundError'
    this.source = source
    this.filePath = filePath
  }
}

export class InternalSchemaValidationError extends Error {
  constructor() {
    super('Config has empty modules array (schema validation should prevent this)')
    this.name = 'InternalSchemaValidationError'
  }
}
