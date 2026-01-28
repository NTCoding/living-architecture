import type { RiviereGraph } from '@living-architecture/riviere-schema'
import type {
  CrossDomainLink, DomainConnection 
} from './domain-types'
import {
  queryCrossDomainLinks, queryDomainConnections 
} from './cross-domain-queries'

export class CrossDomainQueries {
  constructor(private readonly graph: RiviereGraph) {}

  links(domainName: string): CrossDomainLink[] {
    return queryCrossDomainLinks(this.graph, domainName)
  }

  connections(domainName: string): DomainConnection[] {
    return queryDomainConnections(this.graph, domainName)
  }
}
