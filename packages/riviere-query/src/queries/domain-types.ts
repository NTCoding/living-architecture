import type { DomainName } from './branded-types'
import type { LinkType } from './flow-types'
import type { ComponentCounts } from './stats-types'

export interface Domain {
  name: string
  description: string
  systemType: 'domain' | 'bff' | 'ui' | 'other'
  componentCounts: ComponentCounts
}

export interface CrossDomainLink {
  targetDomain: DomainName
  linkType: LinkType | undefined
}

export interface DomainConnection {
  targetDomain: DomainName
  direction: 'outgoing' | 'incoming'
  apiCount: number
  eventCount: number
}
