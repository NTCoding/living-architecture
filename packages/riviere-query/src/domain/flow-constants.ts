import type { ComponentType } from '@living-architecture/riviere-schema/schema'

const entryPointTypes: ReadonlySet<ComponentType> = new Set<ComponentType>([
  'UI',
  'API',
  'EventHandler',
  'Custom',
])

/** @riviere-role domain-service */
export function isEntryPointType(componentType: ComponentType): boolean {
  return entryPointTypes.has(componentType)
}
