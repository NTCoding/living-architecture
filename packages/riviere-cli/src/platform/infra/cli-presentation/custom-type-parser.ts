import type {
  CustomPropertyDefinition,
  CustomPropertyType,
} from '@living-architecture/riviere-schema'

const VALID_PROPERTY_TYPES: readonly CustomPropertyType[] = [
  'string',
  'number',
  'boolean',
  'array',
  'object',
]

function isValidPropertyType(value: string): value is CustomPropertyType {
  return VALID_PROPERTY_TYPES.some((t) => t === value)
}

function parsePropertySpec(spec: string):
  | {
    name: string
    definition: CustomPropertyDefinition
  }
  | { error: string } {
  const parts = spec.split(':')
  if (parts.length < 2 || parts.length > 3) {
    return {error: `Invalid property format: "${spec}". Expected "name:type" or "name:type:description"`,}
  }

  const [name, type, description] = parts
  if (!name || name.trim() === '') {
    return { error: 'Property name cannot be empty' }
  }

  if (!type || !isValidPropertyType(type)) {
    return {error: `Invalid property type: "${type}". Valid types: ${VALID_PROPERTY_TYPES.join(', ')}`,}
  }

  const definition: CustomPropertyDefinition = { type }
  if (description && description.trim() !== '') {
    definition.description = description
  }

  return {
    name: name.trim(),
    definition,
  }
}

interface ParsePropertiesSuccess {
  success: true
  properties: Record<string, CustomPropertyDefinition>
}

interface ParsePropertiesError {
  success: false
  error: string
}

type ParsePropertiesResult = ParsePropertiesSuccess | ParsePropertiesError

export function parsePropertySpecs(specs: string[] | undefined): ParsePropertiesResult {
  if (specs === undefined || specs.length === 0) {
    return {
      success: true,
      properties: {},
    }
  }

  const properties: Record<string, CustomPropertyDefinition> = {}
  for (const spec of specs) {
    const result = parsePropertySpec(spec)
    if ('error' in result) {
      return {
        success: false,
        error: result.error,
      }
    }
    if (properties[result.name] !== undefined) {
      return {
        success: false,
        error: `Duplicate property name: "${result.name}"`,
      }
    }
    properties[result.name] = result.definition
  }

  return {
    success: true,
    properties,
  }
}
