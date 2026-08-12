import type {
  Component,
  ComponentType,
  DomainOpComponent,
  ExternalLink,
  Link,
  RiviereGraph,
} from '@living-architecture/riviere-schema'
import { parseRiviereGraph } from '@living-architecture/riviere-schema'
import type { GraphDiff } from './graph-diff'

import type { ComponentDepths } from './component-depths'
import type { ComponentId } from './component-id'
import {
  componentsInDomain as filterByDomain,
  componentsByType as filterByType,
  findAllComponents,
  findComponent,
  componentById as lookupComponentById,
  searchComponents,
} from './component-queries'
import type { CrossDomainLink } from './cross-domain-link'
import { queryCrossDomainLinks, queryDomainConnections } from './cross-domain-queries'
import { queryNodeDepths } from './depth-queries'
import type { Domain } from './domain'
import type { DomainConnection } from './domain-connection'
import {
  businessRulesForEntity,
  operationsForEntity,
  queryDomains,
  queryEntities,
  statesForEntity,
  transitionsForEntity,
} from './domain-queries'
import type { Entity } from './entity'
import type { EntityTransition } from './entity-transition'
import type { EventHandlerInfo } from './event-handler-info'
import { queryEventHandlers, queryPublishedEvents } from './event-queries'
import type { ExternalDomain } from './external-domain'
import { queryExternalDomains } from './external-system-queries'
import type { Flow } from './flow'
import { findEntryPoints, queryFlows, searchWithFlowContext, traceFlowFrom } from './flow-queries'
import { diffGraphs } from './graph-diff'
import type { GraphStats } from './graph-stats'
import { detectOrphanComponents, validateGraph } from './graph-validation'
import type { LinkId } from './link-id'
import type { PublishedEvent } from './published-event'
import type { SearchWithFlowOptions } from './search-with-flow-options'
import type { SearchWithFlowResult } from './search-with-flow-result'
import type { State } from './state'
import { queryStats } from './stats-queries'
import type { ValidationResult } from './validation-result'
export type { LinkType } from '@living-architecture/riviere-schema'
export { ComponentNotFoundError } from './errors'
export type { GraphDiff } from './graph-diff'

function assertValidGraph(graph: unknown): asserts graph is RiviereGraph {
  parseRiviereGraph(graph)
}

/**
 * Query and analyze Riviere architecture graphs.
 *
 * RiviereQuery provides methods to explore components, trace execution flows,
 * analyze domain models, and compare graph versions.
 *
 * @example
 * ```typescript
 * import { RiviereQuery } from '@living-architecture/riviere-query'
 *
 * // From JSON
 * const query = RiviereQuery.fromJSON(graphData)
 *
 * // Query components
 * const apis = query.componentsByType('API')
 * const orderDomain = query.componentsInDomain('orders')
 *
 * // Trace flows
 * const flow = query.traceFlow('orders:checkout:api:post-orders')
 * ```
 *
 * @riviere-role domain-service
 */
export class RiviereQuery {
  private readonly graphSnapshot: RiviereGraph

  /**
   * Creates a new RiviereQuery instance.
   *
   * @param graph - A valid RiviereGraph object
   * @throws If the graph fails schema validation
   *
   * @example
   * ```typescript
   * const graph: RiviereGraph = JSON.parse(jsonString)
   * const query = new RiviereQuery(graph)
   * ```
   */
  constructor(graph: RiviereGraph) {
    assertValidGraph(graph)
    this.graphSnapshot = graph
  }

  /**
   * Creates a RiviereQuery from raw JSON data.
   *
   * @param json - Raw JSON data to parse as a RiviereGraph
   * @returns A new RiviereQuery instance
   * @throws If the JSON fails schema validation
   *
   * @example
   * ```typescript
   * const jsonData = await fetch('/graph.json').then(r => r.json())
   * const query = RiviereQuery.fromJSON(jsonData)
   * ```
   */
  static fromJSON(json: unknown): RiviereQuery {
    assertValidGraph(json)
    return new RiviereQuery(json)
  }

  /**
   * Returns all components in the graph.
   *
   * @returns Array of all components
   *
   * @example
   * ```typescript
   * const allComponents = query.components()
   * console.log(`Total: ${allComponents.length}`)
   * ```
   */
  components(): Component[] {
    return this.graphSnapshot.components
  }

  /**
   * Returns all links in the graph.
   *
   * @returns Array of all links
   *
   * @example
   * ```typescript
   * const allLinks = query.links()
   * console.log(`Total links: ${allLinks.length}`)
   * ```
   */
  links(): Link[] {
    return this.graphSnapshot.links
  }

  /**
   * Validates the graph structure beyond schema validation.
   *
   * Checks for structural issues like invalid link references.
   *
   * @returns Validation result with any errors found
   *
   * @example
   * ```typescript
   * const result = query.validate()
   * if (!result.valid) {
   *   console.error('Validation errors:', result.errors)
   * }
   * ```
   */
  validate(): ValidationResult {
    return validateGraph(this.graphSnapshot)
  }

  /**
   * Detects orphan components with no incoming or outgoing links.
   *
   * @returns Array of component IDs that are disconnected from the graph
   *
   * @example
   * ```typescript
   * const orphanIds = query.detectOrphans()
   * if (orphanIds.length > 0) {
   *   console.warn(`Found ${orphanIds.length} orphan nodes`)
   * }
   * ```
   */
  detectOrphans(): ComponentId[] {
    return detectOrphanComponents(this.graphSnapshot)
  }

  /**
   * Finds the first component matching a predicate.
   *
   * @param predicate - Function that returns true for matching components
   * @returns The first matching component, or undefined if none found
   *
   * @example
   * ```typescript
   * const checkout = query.find(c => c.name.includes('checkout'))
   * ```
   */
  find(predicate: (component: Component) => boolean): Component | undefined {
    return findComponent(this.graphSnapshot, predicate)
  }

  /**
   * Finds all components matching a predicate.
   *
   * @param predicate - Function that returns true for matching components
   * @returns Array of all matching components
   *
   * @example
   * ```typescript
   * const orderHandlers = query.findAll(c =>
   *   c.type === 'EventHandler' && c.domain === 'orders'
   * )
   * ```
   */
  findAll(predicate: (component: Component) => boolean): Component[] {
    return findAllComponents(this.graphSnapshot, predicate)
  }

  /**
   * Finds a component by its ID.
   *
   * @param id - The component ID to look up
   * @returns The component, or undefined if not found
   *
   * @example
   * ```typescript
   * const component = query.componentById('orders:checkout:api:post-orders')
   * ```
   */
  componentById(id: ComponentId): Component | undefined {
    return lookupComponentById(this.graphSnapshot, id.value)
  }

  /**
   * Searches components by name, domain, or type.
   *
   * Case-insensitive search across component name, domain, and type fields.
   *
   * @param query - Search term
   * @returns Array of matching components
   *
   * @example
   * ```typescript
   * const results = query.search('order')
   * // Matches: "PlaceOrder", "orders" domain, etc.
   * ```
   */
  search(query: string): Component[] {
    return searchComponents(this.graphSnapshot, query)
  }

  /**
   * Returns all components in a specific domain.
   *
   * @param domainName - The domain name to filter by
   * @returns Array of components in the domain
   *
   * @example
   * ```typescript
   * const orderComponents = query.componentsInDomain('orders')
   * ```
   */
  componentsInDomain(domainName: string): Component[] {
    return filterByDomain(this.graphSnapshot, domainName)
  }

  /**
   * Returns all components of a specific type.
   *
   * @param type - The component type to filter by
   * @returns Array of components of that type
   *
   * @example
   * ```typescript
   * const apis = query.componentsByType('API')
   * const events = query.componentsByType('Event')
   * ```
   */
  componentsByType(type: ComponentType): Component[] {
    return filterByType(this.graphSnapshot, type)
  }

  /**
   * Returns domain information with component counts.
   *
   * @returns Array of Domain objects sorted by name
   *
   * @example
   * ```typescript
   * const domains = query.domains()
   * for (const domain of domains) {
   *   console.log(`${domain.name}: ${domain.componentCounts.total} components`)
   * }
   * ```
   */
  domains(): Domain[] {
    return queryDomains(this.graphSnapshot)
  }

  /**
   * Returns all domain operations for a specific entity.
   *
   * @param entityName - The entity name to get operations for
   * @returns Array of DomainOp components targeting the entity
   *
   * @example
   * ```typescript
   * const orderOps = query.operationsFor('Order')
   * ```
   */
  operationsFor(entityName: string): DomainOpComponent[] {
    return operationsForEntity(this.graphSnapshot, entityName)
  }

  /**
   * Returns entities with their domain operations.
   *
   * @param domainName - Optional domain to filter by
   * @returns Array of Entity objects with their operations
   *
   * @example
   * ```typescript
   * const allEntities = query.entities()
   * const orderEntities = query.entities('orders')
   *
   * for (const entity of orderEntities) {
   *   console.log(`${entity.name} has ${entity.operations.length} operations`)
   * }
   * ```
   */
  entities(domainName?: string): Entity[] {
    return queryEntities(this.graphSnapshot, domainName)
  }

  /**
   * Returns all business rules for an entity's operations.
   *
   * @param entityName - The entity name to get rules for
   * @returns Array of business rule strings
   *
   * @example
   * ```typescript
   * const rules = query.businessRulesFor('Order')
   * ```
   */
  businessRulesFor(entityName: string): string[] {
    return businessRulesForEntity(this.graphSnapshot, entityName)
  }

  /**
   * Returns state transitions for an entity.
   *
   * @param entityName - The entity name to get transitions for
   * @returns Array of EntityTransition objects
   *
   * @example
   * ```typescript
   * const transitions = query.transitionsFor('Order')
   * ```
   */
  transitionsFor(entityName: string): EntityTransition[] {
    return transitionsForEntity(this.graphSnapshot, entityName)
  }

  /**
   * Returns ordered states for an entity based on transitions.
   *
   * States are ordered by transition flow from initial to final states.
   *
   * @param entityName - The entity name to get states for
   * @returns Array of state names in transition order
   *
   * @example
   * ```typescript
   * const orderStates = query.statesFor('Order')
   * // ['pending', 'confirmed', 'shipped', 'delivered']
   * ```
   */
  statesFor(entityName: string): State[] {
    return statesForEntity(this.graphSnapshot, entityName)
  }

  /**
   * Returns components that are entry points to the system.
   *
   * Entry points are UI, API, EventHandler, or Custom components
   * with no incoming links.
   *
   * @returns Array of entry point components
   *
   * @example
   * ```typescript
   * const entryPoints = query.entryPoints()
   * ```
   */
  entryPoints(): Component[] {
    return findEntryPoints(this.graphSnapshot)
  }

  /**
   * Traces the complete flow bidirectionally from a starting component.
   *
   * Returns all nodes and links connected to the starting point,
   * following links in both directions.
   *
   * @param startComponentId - ID of the component to start tracing from
   * @returns Object with componentIds and linkIds in the flow
   *
   * @example
   * ```typescript
   * const flow = query.traceFlow('orders:checkout:api:post-orders')
   * console.log(`Flow includes ${flow.componentIds.length} nodes`)
   * ```
   */
  traceFlow(startComponentId: ComponentId): {
    componentIds: ComponentId[]
    linkIds: LinkId[]
  } {
    return traceFlowFrom(this.graphSnapshot, startComponentId)
  }

  /**
   * Compares this graph with another and returns the differences.
   *
   * @param other - The graph to compare against
   * @returns GraphDiff with added, removed, and modified items
   *
   * @example
   * ```typescript
   * const oldGraph = RiviereQuery.fromJSON(oldData)
   * const newGraph = RiviereQuery.fromJSON(newData)
   * const diff = newGraph.diff(oldGraph.graph)
   *
   * console.log(`Added: ${diff.stats.componentsAdded}`)
   * console.log(`Removed: ${diff.stats.componentsRemoved}`)
   * ```
   */
  diff(other: RiviereGraph): GraphDiff {
    return diffGraphs(this.graphSnapshot, other)
  }

  /**
   * Returns published events with their handlers.
   *
   * @param domainName - Optional domain to filter by
   * @returns Array of PublishedEvent objects sorted by event name
   *
   * @example
   * ```typescript
   * const allEvents = query.publishedEvents()
   * const orderEvents = query.publishedEvents('orders')
   *
   * for (const event of orderEvents) {
   *   console.log(`${event.eventName} has ${event.handlers.length} handlers`)
   * }
   * ```
   */
  publishedEvents(domainName?: string): PublishedEvent[] {
    return queryPublishedEvents(this.graphSnapshot, domainName)
  }

  /**
   * Returns event handlers with their subscriptions.
   *
   * @param eventName - Optional event name to filter handlers by
   * @returns Array of EventHandlerInfo objects sorted by handler name
   *
   * @example
   * ```typescript
   * const allHandlers = query.eventHandlers()
   * const orderPlacedHandlers = query.eventHandlers('order-placed')
   * ```
   */
  eventHandlers(eventName?: string): EventHandlerInfo[] {
    return queryEventHandlers(this.graphSnapshot, eventName)
  }

  /**
   * Returns all flows in the graph.
   *
   * Each flow starts from an entry point (UI, API, or Custom with no
   * incoming links) and traces forward through the graph.
   *
   * @returns Array of Flow objects with entry point and steps
   *
   * @example
   * ```typescript
   * const flows = query.flows()
   *
   * for (const flow of flows) {
   *   console.log(`Flow: ${flow.entryPoint.name}`)
   *   for (const step of flow.steps) {
   *     console.log(`  ${step.component.name} (depth: ${step.depth})`)
   *   }
   * }
   * ```
   */
  flows(): Flow[] {
    return queryFlows(this.graphSnapshot)
  }

  /**
   * Searches for components and returns their flow context.
   *
   * Returns both matching component IDs and all visible IDs in their flows.
   *
   * @param query - Search term
   * @param options - Search options including returnAllOnEmptyQuery
   * @returns Object with matchingIds and visibleIds arrays
   *
   * @example
   * ```typescript
   * const result = query.searchWithFlow('checkout', { returnAllOnEmptyQuery: true })
   * console.log(`Found ${result.matchingIds.length} matches`)
   * console.log(`Showing ${result.visibleIds.length} nodes in context`)
   * ```
   */
  searchWithFlow(query: string, options: SearchWithFlowOptions): SearchWithFlowResult {
    return searchWithFlowContext(this.graphSnapshot, query, options)
  }

  /**
   * Returns links from a domain to other domains.
   *
   * @param domainName - The source domain name
   * @returns Array of CrossDomainLink objects (deduplicated by target domain and type)
   *
   * @example
   * ```typescript
   * const outgoing = query.crossDomainLinks('orders')
   * ```
   */
  crossDomainLinks(domainName: string): CrossDomainLink[] {
    return queryCrossDomainLinks(this.graphSnapshot, domainName)
  }

  /**
   * Returns cross-domain connections with API and event counts.
   *
   * Shows both incoming and outgoing connections for a domain.
   *
   * @param domainName - The domain to analyze
   * @returns Array of DomainConnection objects
   *
   * @example
   * ```typescript
   * const connections = query.domainConnections('orders')
   * for (const conn of connections) {
   *   console.log(`${conn.direction} to ${conn.targetDomain}: ${conn.apiCount} API, ${conn.eventCount} event`)
   * }
   * ```
   */
  domainConnections(domainName: string): DomainConnection[] {
    return queryDomainConnections(this.graphSnapshot, domainName)
  }

  /**
   * Returns aggregate statistics about the graph.
   *
   * @returns GraphStats with counts for components, links, domains, APIs, entities, and events
   *
   * @example
   * ```typescript
   * const stats = query.stats()
   * console.log(`Components: ${stats.componentCount}`)
   * console.log(`Links: ${stats.linkCount}`)
   * console.log(`Domains: ${stats.domainCount}`)
   * ```
   */
  stats(): GraphStats {
    return queryStats(this.graphSnapshot)
  }

  /**
   * Calculates depth from entry points for each component.
   *
   * Components unreachable from entry points will not be in the map.
   *
   * @returns Map of component ID to depth (0 = entry point)
   *
   * @example
   * ```typescript
   * const depths = query.nodeDepths()
   * for (const [id, depth] of depths) {
   *   console.log(`${id}: depth ${depth}`)
   * }
   * ```
   */
  nodeDepths(): ComponentDepths {
    return queryNodeDepths(this.graphSnapshot)
  }

  /**
   * Returns all external links in the graph.
   *
   * External links represent connections from components to external
   * systems that are not part of the graph (e.g., third-party APIs).
   *
   * @returns Array of all external links, or empty array if none exist
   *
   * @example
   * ```typescript
   * const externalLinks = query.externalLinks()
   * for (const link of externalLinks) {
   *   console.log(`${link.source} -> ${link.target.name}`)
   * }
   * ```
   */
  externalLinks(): ExternalLink[] {
    return this.graphSnapshot.externalLinks ?? []
  }

  /**
   * Returns external domains that components connect to.
   *
   * Each unique external target is returned as a separate ExternalDomain,
   * with aggregated source domains and connection counts.
   *
   * @returns Array of ExternalDomain objects, sorted alphabetically by name
   *
   * @example
   * ```typescript
   * const externals = query.externalDomains()
   * for (const ext of externals) {
   *   console.log(`${ext.name}: ${ext.connectionCount} connections from ${ext.sourceDomains.join(', ')}`)
   * }
   * ```
   */
  externalDomains(): ExternalDomain[] {
    return queryExternalDomains(this.graphSnapshot)
  }
}

export type { ComponentCounts } from './component-counts'
export type { ComponentModification } from './component-modification'
export type { CrossDomainLink } from './cross-domain-link'
export type { DiffStats } from './diff-stats'
export type { Domain } from './domain'
export type { DomainConnection } from './domain-connection'
export type { Entity } from './entity'
export type { EntityTransition } from './entity-transition'
export type { ExternalDomain } from './external-domain'
export type { Flow } from './flow'
export type { FlowStep } from './flow-step'
export type { GraphStats } from './graph-stats'
export type { SearchWithFlowOptions } from './search-with-flow-options'
export type { SearchWithFlowResult } from './search-with-flow-result'
export type { ValidationError } from './validation-error'
export type { ValidationResult } from './validation-result'
