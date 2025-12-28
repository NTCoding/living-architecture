import type { CustomTypeDefinition, DomainMetadata } from '@living-architecture/riviere-schema'
import { CustomTypeNotFoundError, DomainNotFoundError } from './errors'

export function assertDomainExists(domains: Record<string, DomainMetadata>, domain: string): void {
  if (!domains[domain]) {
    throw new DomainNotFoundError(domain)
  }
}

export function assertCustomTypeExists(
  customTypes: Record<string, CustomTypeDefinition>,
  customTypeName: string
): void {
  if (!customTypes[customTypeName]) {
    const definedTypes = Object.keys(customTypes)
    throw new CustomTypeNotFoundError(customTypeName, definedTypes)
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
