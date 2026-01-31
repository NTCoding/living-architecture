import type { ComponentType } from '@living-architecture/riviere-schema'

export const ENTRY_POINT_TYPES: ReadonlySet<ComponentType> = new Set<ComponentType>([
  'UI',
  'API',
  'EventHandler',
  'Custom',
])
