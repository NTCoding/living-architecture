import {
  InvalidComponentTypeError, InvalidNormalizedComponentTypeError 
} from '../errors/errors'

export const VALID_COMPONENT_TYPES = [
  'UI',
  'API',
  'UseCase',
  'DomainOp',
  'Event',
  'EventHandler',
  'Custom',
] as const
/** @riviere-role value-object */
export type ComponentTypeFlag = (typeof VALID_COMPONENT_TYPES)[number]

/** @riviere-role cli-input-validator */
export function isValidComponentType(value: string): value is ComponentTypeFlag {
  return VALID_COMPONENT_TYPES.some((t) => t.toLowerCase() === value.toLowerCase())
}

/** @riviere-role command-input-factory */
export function normalizeToSchemaComponentType(value: string): ComponentTypeFlag {
  const found = VALID_COMPONENT_TYPES.find((t) => t.toLowerCase() === value.toLowerCase())
  if (found === undefined) {
    throw new InvalidComponentTypeError(value, VALID_COMPONENT_TYPES)
  }
  return found
}

/** @riviere-role command-input-factory */
export function normalizeComponentType(value: string): string {
  const typeMap: Record<string, string> = {
    ui: 'ui',
    api: 'api',
    usecase: 'usecase',
    domainop: 'domainop',
    event: 'event',
    eventhandler: 'eventhandler',
    custom: 'custom',
  }
  const normalized = typeMap[value.toLowerCase()]
  if (normalized === undefined) {
    throw new InvalidNormalizedComponentTypeError(value, Object.keys(typeMap))
  }
  return normalized
}

export const VALID_SYSTEM_TYPES = ['domain', 'bff', 'ui', 'other'] as const
/** @riviere-role value-object */
export type SystemTypeFlag = (typeof VALID_SYSTEM_TYPES)[number]

/** @riviere-role cli-input-validator */
export function isValidSystemType(value: string): value is SystemTypeFlag {
  return VALID_SYSTEM_TYPES.some((t) => t === value)
}

export const VALID_API_TYPES = ['REST', 'GraphQL', 'other'] as const
/** @riviere-role value-object */
export type ApiTypeFlag = (typeof VALID_API_TYPES)[number]

/** @riviere-role cli-input-validator */
export function isValidApiType(value: string): value is ApiTypeFlag {
  return VALID_API_TYPES.some((t) => t.toLowerCase() === value.toLowerCase())
}

export const VALID_LINK_TYPES = ['sync', 'async'] as const
/** @riviere-role value-object */
export type LinkType = (typeof VALID_LINK_TYPES)[number]

/** @riviere-role cli-input-validator */
export function isValidLinkType(value: string): value is LinkType {
  return VALID_LINK_TYPES.some((t) => t === value)
}
