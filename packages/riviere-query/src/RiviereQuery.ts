import type { RiviereGraph, Component, Link, ComponentType, DomainOpComponent } from '@living-architecture/riviere-schema'
import type { Entity, EntityTransition, PublishedEvent, EventHandlerInfo } from './event-types'
import type { State, ComponentId, LinkId, ValidationResult, GraphDiff, Domain, Flow, SearchWithFlowResult, CrossDomainLink, DomainConnection, GraphStats } from './domain-types'
import { parseRiviereGraph } from '@living-architecture/riviere-schema'

import { findComponent, findAllComponents, componentById as lookupComponentById, searchComponents, componentsInDomain as filterByDomain, componentsByType as filterByType } from './component-queries'
import { queryDomains, operationsForEntity, queryEntities, businessRulesForEntity, transitionsForEntity, statesForEntity } from './domain-queries'
import { findEntryPoints, traceFlowFrom, queryFlows, searchWithFlowContext, type SearchWithFlowOptions } from './flow-queries'
import { queryCrossDomainLinks, queryDomainConnections } from './cross-domain-queries'
import { queryPublishedEvents, queryEventHandlers } from './event-queries'
import { validateGraph, detectOrphanComponents } from './graph-validation'
import { diffGraphs } from './graph-diff'
import { queryStats } from './stats-queries'
import { queryNodeDepths } from './depth-queries'

export type { Entity, EntityTransition } from './event-types'
export type { ComponentId, LinkId, ValidationErrorCode, ValidationError, ValidationResult, Domain, ComponentCounts, ComponentModification, DiffStats, GraphDiff, Flow, FlowStep, LinkType, SearchWithFlowResult, CrossDomainLink, DomainConnection, GraphStats } from './domain-types'
export type { SearchWithFlowOptions } from './flow-queries'
export { parseComponentId } from './domain-types'

function assertValidGraph(graph: unknown): asserts graph is RiviereGraph {
  parseRiviereGraph(graph)
}

export class RiviereQuery {
  private readonly graph: RiviereGraph

  constructor(graph: RiviereGraph) {
    assertValidGraph(graph)
    this.graph = graph
  }

  static fromJSON(json: unknown): RiviereQuery {
    assertValidGraph(json)
    return new RiviereQuery(json)
  }

  components(): Component[] {
    return this.graph.components
  }

  links(): Link[] {
    return this.graph.links
  }

  validate(): ValidationResult {
    return validateGraph(this.graph)
  }

  detectOrphans(): ComponentId[] {
    return detectOrphanComponents(this.graph)
  }

  find(predicate: (component: Component) => boolean): Component | undefined {
    return findComponent(this.graph, predicate)
  }

  findAll(predicate: (component: Component) => boolean): Component[] {
    return findAllComponents(this.graph, predicate)
  }

  componentById(id: ComponentId): Component | undefined {
    return lookupComponentById(this.graph, id)
  }

  search(query: string): Component[] {
    return searchComponents(this.graph, query)
  }

  componentsInDomain(domainName: string): Component[] {
    return filterByDomain(this.graph, domainName)
  }

  componentsByType(type: ComponentType): Component[] {
    return filterByType(this.graph, type)
  }

  domains(): Domain[] {
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

  entryPoints(): Component[] {
    return findEntryPoints(this.graph)
  }

  traceFlow(startComponentId: ComponentId): { componentIds: ComponentId[]; linkIds: LinkId[] } {
    return traceFlowFrom(this.graph, startComponentId)
  }

  diff(other: RiviereGraph): GraphDiff {
    return diffGraphs(this.graph, other)
  }

  publishedEvents(domainName?: string): PublishedEvent[] {
    return queryPublishedEvents(this.graph, domainName)
  }

  eventHandlers(eventName?: string): EventHandlerInfo[] {
    return queryEventHandlers(this.graph, eventName)
  }

  flows(): Flow[] {
    return queryFlows(this.graph)
  }

  searchWithFlow(query: string, options: SearchWithFlowOptions): SearchWithFlowResult {
    return searchWithFlowContext(this.graph, query, options)
  }

  crossDomainLinks(domainName: string): CrossDomainLink[] {
    return queryCrossDomainLinks(this.graph, domainName)
  }

  domainConnections(domainName: string): DomainConnection[] {
    return queryDomainConnections(this.graph, domainName)
  }

  stats(): GraphStats {
    return queryStats(this.graph)
  }

  nodeDepths(): Map<ComponentId, number> {
    return queryNodeDepths(this.graph)
  }
}
