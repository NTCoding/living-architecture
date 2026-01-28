import type {
  RiviereGraph, ExternalLink 
} from '@living-architecture/riviere-schema'
import type { ExternalDomain } from './stats-types'
import { queryExternalDomains } from './external-system-queries'

export class ExternalQueries {
  constructor(private readonly graph: RiviereGraph) {}

  links(): ExternalLink[] {
    return this.graph.externalLinks ?? []
  }

  domains(): ExternalDomain[] {
    return queryExternalDomains(this.graph)
  }
}
