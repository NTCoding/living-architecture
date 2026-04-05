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
    definition: CustomPropertyDefinition
    name: string
  }
  | { error: string } {
  const parts = spec.split(':')
  if (parts.length < 2 || parts.length > 3)
    return {error: `Invalid property format: "${spec}". Expected "name:type" or "name:type:description"`,}
  const [name, type, description] = parts
  if (!name || name.trim() === '') return { error: 'Property name cannot be empty' }
  if (!type || !isValidPropertyType(type))
    return {error: `Invalid property type: "${type}". Valid types: ${VALID_PROPERTY_TYPES.join(', ')}`,}
  const definition: CustomPropertyDefinition = { type }
  if (description && description.trim() !== '') definition.description = description
  return {
    definition,
    name: name.trim(),
  }
}

type ParsePropertiesResult =
  | {
    properties: Record<string, CustomPropertyDefinition>
    success: true
  }
  | {
    error: string
    success: false
  }

/** @riviere-role cli-input-validator */
export function parsePropertySpecs(specs: string[] | undefined): ParsePropertiesResult {
  if (specs === undefined || specs.length === 0)
    return {
      properties: {},
      success: true,
    }
  const properties: Record<string, CustomPropertyDefinition> = {}
  for (const spec of specs) {
    const result = parsePropertySpec(spec)
    if ('error' in result)
      return {
        error: result.error,
        success: false,
      }
    if (properties[result.name] !== undefined)
      return {
        error: `Duplicate property name: "${result.name}"`,
        success: false,
      }
    properties[result.name] = result.definition
  }
  return {
    properties,
    success: true,
  }
}
