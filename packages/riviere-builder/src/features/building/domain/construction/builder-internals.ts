import type {
  Component,
  CustomTypeDefinition,
  DomainMetadata,
} from '@living-architecture/riviere-schema'
import { ComponentId } from '@living-architecture/riviere-schema'
import { createSourceNotFoundError } from '../error-recovery/component-suggestion'
import {
  assertCustomTypeExists,
  assertDomainExists,
  assertRequiredPropertiesProvided,
} from './builder-assertions'

/** @riviere-role domain-service */
export function generateComponentId(
  domain: string,
  module: string,
  type: string,
  name: string,
): string {
  const nameSegment = name.toLowerCase().replaceAll(/\s+/g, '-')
  return `${domain}:${module}:${type}:${nameSegment}`
}

/** @riviere-role domain-service */
export function createComponentNotFoundError(components: Component[], id: string): Error {
  return createSourceNotFoundError(components, ComponentId.parse(id))
}

/** @riviere-role domain-service */
export function validateDomainExists(
  domains: Record<string, DomainMetadata>,
  domain: string,
): void {
  assertDomainExists(domains, domain)
}

/** @riviere-role domain-service */
export function validateCustomType(
  customTypes: Record<string, CustomTypeDefinition>,
  customTypeName: string,
): void {
  assertCustomTypeExists(customTypes, customTypeName)
}

/** @riviere-role domain-service */
export function validateRequiredProperties(
  customTypes: Record<string, CustomTypeDefinition>,
  customTypeName: string,
  metadata: Record<string, unknown> | undefined,
): void {
  assertRequiredPropertiesProvided(customTypes, customTypeName, metadata)
}
