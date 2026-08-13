import type {
  Component,
  CustomTypeDefinition,
  DomainMetadata,
} from '@living-architecture/riviere-schema/schema'
import { ComponentId } from '@living-architecture/riviere-schema/component-id'
import { createSourceNotFoundError } from '../error-recovery/component-suggestion'
import { ComponentNotFoundError } from './construction-errors'
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
export function createComponentNotFoundError(components: readonly Component[], id: string): Error {
  const parsed = ComponentId.parse(id)
  if (!parsed.success) return new ComponentNotFoundError(id, [])
  return createSourceNotFoundError(components, parsed.componentId)
}

/** @riviere-role domain-service */
export function validateDomainExists(
  domains: Readonly<Record<string, DomainMetadata>>,
  domain: string,
): void {
  assertDomainExists(domains, domain)
}

/** @riviere-role domain-service */
export function validateCustomType(
  customTypes: Readonly<Record<string, CustomTypeDefinition>>,
  customTypeName: string,
): void {
  assertCustomTypeExists(customTypes, customTypeName)
}

/** @riviere-role domain-service */
export function validateRequiredProperties(
  customTypes: Readonly<Record<string, CustomTypeDefinition>>,
  customTypeName: string,
  metadata: Record<string, unknown> | undefined,
): void {
  assertRequiredPropertiesProvided(customTypes, customTypeName, metadata)
}
