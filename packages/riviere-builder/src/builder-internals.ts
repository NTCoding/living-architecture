import type {
  Component,
  CustomTypeDefinition,
  DomainMetadata,
} from '@living-architecture/riviere-schema';
import { ComponentId } from '@living-architecture/riviere-schema';
import { createSourceNotFoundError } from './component-suggestion';
import {
  assertCustomTypeExists,
  assertDomainExists,
  assertRequiredPropertiesProvided,
} from './builder-assertions';

export function generateComponentId(
  domain: string,
  module: string,
  type: string,
  name: string,
): string {
  const nameSegment = name.toLowerCase().replace(/\s+/g, '-');
  return `${domain}:${module}:${type}:${nameSegment}`;
}

export function createComponentNotFoundError(components: Component[], id: string): Error {
  return createSourceNotFoundError(components, ComponentId.parse(id));
}

export function validateDomainExists(
  domains: Record<string, DomainMetadata>,
  domain: string,
): void {
  assertDomainExists(domains, domain);
}

export function validateCustomType(
  customTypes: Record<string, CustomTypeDefinition>,
  customTypeName: string,
): void {
  assertCustomTypeExists(customTypes, customTypeName);
}

export function validateRequiredProperties(
  customTypes: Record<string, CustomTypeDefinition>,
  customTypeName: string,
  metadata: Record<string, unknown> | undefined,
): void {
  assertRequiredPropertiesProvided(customTypes, customTypeName, metadata);
}
