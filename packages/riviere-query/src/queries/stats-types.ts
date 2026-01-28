import type { DomainName } from './branded-types'

export interface ComponentCounts {
  UI: number
  API: number
  UseCase: number
  DomainOp: number
  Event: number
  EventHandler: number
  Custom: number
  total: number
}

export interface GraphStats {
  componentCount: number
  linkCount: number
  domainCount: number
  apiCount: number
  entityCount: number
  eventCount: number
}

export interface ExternalDomain {
  name: string
  sourceDomains: DomainName[]
  connectionCount: number
}
