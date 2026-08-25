import type { ComponentType } from '@living-architecture/riviere-schema-published-language/schema'

const entryPointTypes: ReadonlySet<ComponentType> = new Set<ComponentType>([
  'UI',
  'API',
  'EventHandler',
  'Custom',
])

/**
 * @riviere-role domain-service
 * @riviere-role-justification TODO: Added before justification rule introduced.
 */
export function isEntryPointType(componentType: ComponentType): boolean {
  return entryPointTypes.has(componentType)
}
