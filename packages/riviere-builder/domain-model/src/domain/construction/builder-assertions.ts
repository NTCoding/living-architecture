import type {
  CustomTypeDefinition,
  DomainMetadata,
} from '@living-architecture/riviere-schema-published-language/schema'
import {
  CustomTypeNotFoundError,
  DomainNotFoundError,
  MissingRequiredPropertiesError,
} from './construction-errors'

/**
 * @riviere-role domain-service
 * @riviere-role-justification TODO: Added before justification rule introduced.
 */
export function assertDomainExists(
  domains: Readonly<Record<string, DomainMetadata>>,
  domain: string,
): void {
  if (!domains[domain]) {
    throw new DomainNotFoundError(domain)
  }
}

/**
 * @riviere-role domain-service
 * @riviere-role-justification TODO: Added before justification rule introduced.
 */
export function assertCustomTypeExists(
  customTypes: Readonly<Record<string, CustomTypeDefinition>>,
  customTypeName: string,
): void {
  if (!customTypes[customTypeName]) {
    const definedTypes = Object.keys(customTypes)
    throw new CustomTypeNotFoundError(customTypeName, definedTypes)
  }
}

/**
 * @riviere-role domain-service
 * @riviere-role-justification TODO: Added before justification rule introduced.
 */
export function assertRequiredPropertiesProvided(
  customTypes: Readonly<Record<string, CustomTypeDefinition>>,
  customTypeName: string,
  metadata: Record<string, unknown> | undefined,
): void {
  const typeDefinition = customTypes[customTypeName]
  if (!typeDefinition?.requiredProperties) {
    return
  }

  const requiredKeys = Object.keys(typeDefinition.requiredProperties)
  const providedKeys = metadata ? Object.keys(metadata) : []
  const missingKeys = requiredKeys.filter((key) => !providedKeys.includes(key))

  if (missingKeys.length > 0) {
    throw new MissingRequiredPropertiesError(customTypeName, missingKeys)
  }
}
