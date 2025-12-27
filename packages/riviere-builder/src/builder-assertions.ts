import type { CustomTypeDefinition, DomainMetadata } from '@living-architecture/riviere-schema'

export function assertDomainExists(domains: Record<string, DomainMetadata>, domain: string): void {
  if (!domains[domain]) {
    throw new Error(`Domain '${domain}' does not exist`)
  }
}

export function assertCustomTypeExists(
  customTypes: Record<string, CustomTypeDefinition>,
  customTypeName: string
): void {
  if (!customTypes[customTypeName]) {
    const definedTypes = Object.keys(customTypes)
    if (definedTypes.length === 0) {
      throw new Error(`Custom type '${customTypeName}' not defined. No custom types have been defined.`)
    }
    throw new Error(`Custom type '${customTypeName}' not defined. Defined types: ${definedTypes.join(', ')}`)
  }
}

export function assertRequiredPropertiesProvided(
  customTypes: Record<string, CustomTypeDefinition>,
  customTypeName: string,
  metadata: Record<string, unknown> | undefined
): void {
  const typeDefinition = customTypes[customTypeName]
  if (!typeDefinition?.requiredProperties) {
    return
  }

  const requiredKeys = Object.keys(typeDefinition.requiredProperties)
  const providedKeys = metadata ? Object.keys(metadata) : []
  const missingKeys = requiredKeys.filter((key) => !providedKeys.includes(key))

  if (missingKeys.length > 0) {
    throw new Error(`Missing required properties for '${customTypeName}': ${missingKeys.join(', ')}`)
  }
}
