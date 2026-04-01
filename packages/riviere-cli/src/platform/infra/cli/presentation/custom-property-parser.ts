class InvalidCustomPropertyError extends Error {
  readonly property: string

  constructor(property: string) {
    super(`Invalid custom property format: ${property}. Expected 'key:value'`)
    this.name = 'InvalidCustomPropertyError'
    this.property = property
  }
}

/** @riviere-role command-input-factory */
export function parseCustomProperties(
  properties: string[] | undefined,
): Record<string, string> | undefined {
  if (!properties || properties.length === 0) {
    return undefined
  }
  const metadata: Record<string, string> = {}
  for (const prop of properties) {
    const colonIndex = prop.indexOf(':')
    if (colonIndex === -1) {
      throw new InvalidCustomPropertyError(prop)
    }
    const key = prop.slice(0, colonIndex)
    const value = prop.slice(colonIndex + 1)
    metadata[key] = value
  }
  return metadata
}
