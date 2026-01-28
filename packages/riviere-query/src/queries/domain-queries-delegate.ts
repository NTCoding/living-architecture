import type {
  RiviereGraph, DomainOpComponent 
} from '@living-architecture/riviere-schema'
import type {
  Entity, EntityTransition 
} from './entity'
import type { State } from './branded-types'
import type { Domain } from './domain-types'
import {
  queryDomains,
  operationsForEntity,
  queryEntities,
  businessRulesForEntity,
  transitionsForEntity,
  statesForEntity,
} from './domain-queries'

export class DomainQueries {
  constructor(private readonly graph: RiviereGraph) {}

  all(): Domain[] {
    return queryDomains(this.graph)
  }

  operationsFor(entityName: string): DomainOpComponent[] {
    return operationsForEntity(this.graph, entityName)
  }

  entities(domainName?: string): Entity[] {
    return queryEntities(this.graph, domainName)
  }

  businessRulesFor(entityName: string): string[] {
    return businessRulesForEntity(this.graph, entityName)
  }

  transitionsFor(entityName: string): EntityTransition[] {
    return transitionsForEntity(this.graph, entityName)
  }

  statesFor(entityName: string): State[] {
    return statesForEntity(this.graph, entityName)
  }
}
