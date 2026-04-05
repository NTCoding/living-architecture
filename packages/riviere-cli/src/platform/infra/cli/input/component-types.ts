export const VALID_COMPONENT_TYPES = [
  'UI',
  'API',
  'UseCase',
  'DomainOp',
  'Event',
  'EventHandler',
  'Custom',
] as const

type ComponentTypeFlag = (typeof VALID_COMPONENT_TYPES)[number]

class InvalidComponentTypeError extends Error {
  readonly validTypes: readonly string[]
  readonly value: string

  constructor(value: string, validTypes: readonly string[]) {
    super(`Expected valid ComponentType. Got: ${value}. Valid types: ${validTypes.join(', ')}`)
    this.name = 'InvalidComponentTypeError'
    this.value = value
    this.validTypes = validTypes
  }
}

class InvalidNormalizedComponentTypeError extends Error {
  readonly validTypes: string[]
  readonly value: string

  constructor(value: string, validTypes: string[]) {
    super(`Invalid component type: ${value}. Valid types: ${validTypes.join(', ')}`)
    this.name = 'InvalidNormalizedComponentTypeError'
    this.value = value
    this.validTypes = validTypes
  }
}

/** @riviere-role cli-input-validator */
export function isValidComponentType(value: string): value is ComponentTypeFlag {
  return VALID_COMPONENT_TYPES.some((t) => t.toLowerCase() === value.toLowerCase())
}

/** @riviere-role cli-input-validator */
export function normalizeToSchemaComponentType(value: string): ComponentTypeFlag {
  const found = VALID_COMPONENT_TYPES.find((t) => t.toLowerCase() === value.toLowerCase())
  if (found === undefined) {
    throw new InvalidComponentTypeError(value, VALID_COMPONENT_TYPES)
  }
  return found
}

/** @riviere-role cli-input-validator */
export function normalizeComponentType(value: string): string {
  const typeMap: Record<string, string> = {
    api: 'api',
    custom: 'custom',
    domainop: 'domainop',
    event: 'event',
    eventhandler: 'eventhandler',
    ui: 'ui',
    usecase: 'usecase',
  }
  const normalized = typeMap[value.toLowerCase()]
  if (normalized === undefined) {
    throw new InvalidNormalizedComponentTypeError(value, Object.keys(typeMap))
  }
  return normalized
}

export const VALID_SYSTEM_TYPES = ['domain', 'bff', 'ui', 'other'] as const
type SystemTypeFlag = (typeof VALID_SYSTEM_TYPES)[number]

/** @riviere-role cli-input-validator */
export function isValidSystemType(value: string): value is SystemTypeFlag {
  return VALID_SYSTEM_TYPES.some((t) => t === value)
}

export const VALID_API_TYPES = ['REST', 'GraphQL', 'other'] as const
type ApiTypeFlag = (typeof VALID_API_TYPES)[number]

/** @riviere-role cli-input-validator */
export function isValidApiType(value: string): value is ApiTypeFlag {
  return VALID_API_TYPES.some((t) => t.toLowerCase() === value.toLowerCase())
}

export const VALID_LINK_TYPES = ['sync', 'async'] as const
type LinkType = (typeof VALID_LINK_TYPES)[number]

/** @riviere-role cli-input-validator */
export function isValidLinkType(value: string): value is LinkType {
  return VALID_LINK_TYPES.some((t) => t === value)
}
