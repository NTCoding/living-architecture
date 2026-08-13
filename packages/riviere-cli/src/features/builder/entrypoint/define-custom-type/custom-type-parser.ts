interface ParsedPropertyDefinition {
  description?: string
  type: string
}

function parsePropertySpec(spec: string):
  | {
      definition: ParsedPropertyDefinition
      name: string
    }
  | { error: string } {
  const parts = spec.split(':')
  if (parts.length < 2 || parts.length > 3)
    return {
      error: `Invalid property format: "${spec}". Expected "name:type" or "name:type:description"`,
    }
  const [name, type, description] = parts
  if (!name || name.trim() === '') return { error: 'Property name cannot be empty' }
  if (!type || type.trim() === '') return { error: 'Property type cannot be empty' }
  const definition: ParsedPropertyDefinition = { type: type.trim() }
  if (description && description.trim() !== '') definition.description = description
  return {
    definition,
    name: name.trim(),
  }
}

type ParsePropertiesResult =
  | {
      properties: Record<string, ParsedPropertyDefinition>
      success: true
    }
  | {
      error: string
      success: false
    }

/** @riviere-role entrypoint-cli-input-parser */
export function parsePropertySpecs(specs: string[] | undefined): ParsePropertiesResult {
  if (specs === undefined || specs.length === 0)
    return {
      properties: {},
      success: true,
    }
  const properties: Record<string, ParsedPropertyDefinition> = {}
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
