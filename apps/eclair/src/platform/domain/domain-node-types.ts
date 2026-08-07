import type { SystemType } from '@living-architecture/riviere-schema'

export type DomainMapSystemType = SystemType | 'external'

export interface DomainNodeData {
  label: string
  nodeCount: number
  systemType: DomainMapSystemType
  calculatedSize?: number
  dimmed?: boolean
  isExternal?: boolean
}
