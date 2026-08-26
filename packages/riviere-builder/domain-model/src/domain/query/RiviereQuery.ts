import type {
  Component,
  ComponentType,
  DomainOpComponent,
  ExternalLink,
  Link,
  RiviereGraph,
} from '@living-architecture/riviere-schema-published-language/schema'
import type { LinkId } from '@living-architecture/riviere-schema-published-language/link-id'
import { parseRiviereGraph } from '@living-architecture/riviere-schema-published-language/validation'
import type { GraphDiff } from './graph-diff'

import type { ComponentDepths } from './component-depths'
import { ComponentCounts } from './component-counts'
import { ComponentId } from './component-id'
import { CodePointSequence } from './code-point-sequence'
import type { CrossDomainLink } from './cross-domain-link'
import { queryCrossDomainLinks, queryDomainConnections } from './cross-domain-queries'
import { queryNodeDepths } from './depth-queries'
import { Domain } from './domain'
import type { DomainConnection } from './domain-connection'
import { DomainName } from './domain-name'
import { Entity } from './entity'
import { EntityName } from './entity-name'
import { EntityTransition } from './entity-transition'
import type { EventHandlerInfo } from './event-handler-info'
import { queryEventHandlers, queryPublishedEvents } from './event-queries'
import type { ExternalDomain } from './external-domain'
import { queryExternalDomains } from './external-system-queries'
import type { Flow } from './flow'
import { findEntryPoints, queryFlows, traceFlowFrom } from './flow-queries'
import { diffGraphs } from './graph-diff'
import type { GraphStats } from './graph-stats'
import { detectOrphanComponents } from './graph-validation'
import { ValidationResult } from '@living-architecture/riviere-schema-published-language/graph-validation'
import { OperationName } from './operation-name'
import type { PublishedEvent } from './published-event'
import type { SearchWithFlowOptions } from './search-with-flow-options'
import { SearchWithFlowResult } from './search-with-flow-result'
import { State } from './state'
import { queryStats } from './stats-queries'
import { ComponentNotFoundError, InvalidRiviereGraphError } from './errors'
export { ComponentNotFoundError } from './errors'

interface PartialEntity {
  name: string
  domain: string
  operations: DomainOpComponent[]
}

function assertValidGraph(graph: unknown): asserts graph is RiviereGraph {
  const result = parseRiviereGraph(graph)
  if (!result.success) {
    throw new InvalidRiviereGraphError(result.issues)
  }
}

/**
 * Query and analyze Riviere architecture graphs.
 *
 * RiviereQuery provides methods to explore components, trace execution flows,
 * analyze domain models, and compare graph versions.
 *
 * @example
 * ```typescript
 * import { RiviereQuery } from '@living-architecture/riviere-builder-domain-model/query'
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
 * @riviere-role-justification Command use cases, query models, and query result types need one stable graph query API so they do not have to discover and assemble the related query services directly.
 * @riviere-role domain-facade
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
    return ValidationResult.parse(this.graphSnapshot)
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
    return this.graphSnapshot.components.find(predicate)
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
    return this.graphSnapshot.components.filter(predicate)
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
    return this.find((component) => component.id === id.value)
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
    if (query === '') return []
    const lowerQuery = query.toLowerCase()
    return this.findAll(
      (component) =>
        component.name.toLowerCase().includes(lowerQuery) ||
        component.domain.toLowerCase().includes(lowerQuery) ||
        component.type.toLowerCase().includes(lowerQuery),
    )
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
    return this.findAll((component) => component.domain === domainName)
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
    return this.findAll((component) => component.type === type)
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
    return this.queryDomains()
  }

  private queryDomains(): Domain[] {
    return Object.entries(this.graphSnapshot.metadata.domains).map(([name, metadata]) => {
      const domainComponents = this.componentsInDomain(name)
      const count = (type: string): number =>
        domainComponents.filter((component) => component.type === type).length
      const componentCounts = ComponentCounts.parse({
        UI: count('UI'),
        API: count('API'),
        UseCase: count('UseCase'),
        DomainOp: count('DomainOp'),
        Event: count('Event'),
        EventHandler: count('EventHandler'),
        Custom: count('Custom'),
        total: domainComponents.length,
      })
      return Domain.parse({
        name,
        description: metadata.description,
        systemType: metadata.systemType,
        componentCounts,
      })
    })
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
    return this.operationsForEntity(entityName)
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
    return this.queryEntities(domainName)
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
    return this.businessRulesForEntity(entityName)
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
    return this.transitionsForEntity(entityName)
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
    return this.statesForEntity(entityName)
  }

  private operationsForEntity(entityName: string): DomainOpComponent[] {
    return this.graphSnapshot.components.filter(
      (component): component is DomainOpComponent =>
        component.type === 'DomainOp' && component.entity === entityName,
    )
  }

  private queryEntities(domainName?: string): Entity[] {
    const domainOperations = this.graphSnapshot.components.filter(
      (component): component is DomainOpComponent & { entity: string } =>
        component.type === 'DomainOp' && component.entity !== undefined,
    )
    const filtered = domainName
      ? domainOperations.filter((operation) => operation.domain === domainName)
      : domainOperations
    const entityMap = new Map<string, PartialEntity>()
    for (const operation of filtered) {
      const key = `${operation.domain}:${operation.entity}`
      const existing = entityMap.get(key)
      if (existing === undefined) {
        entityMap.set(key, {
          name: operation.entity,
          domain: operation.domain,
          operations: [operation],
        })
      } else {
        entityMap.set(key, {
          ...existing,
          operations: [...existing.operations, operation],
        })
      }
    }
    return Array.from(entityMap.values())
      .sort((left, right) =>
        CodePointSequence.parse(left.name)
          .positionRelativeTo(CodePointSequence.parse(right.name))
          .asAscendingArraySortResult(),
      )
      .map((partial) => this.createEntity(partial))
  }

  private createEntity(partial: PartialEntity): Entity {
    const sortedOperations = [...partial.operations].sort((left, right) =>
      CodePointSequence.parse(left.operationName)
        .positionRelativeTo(CodePointSequence.parse(right.operationName))
        .asAscendingArraySortResult(),
    )
    return Entity.parse(
      EntityName.parse(partial.name),
      DomainName.parse(partial.domain),
      sortedOperations,
      this.statesForEntity(partial.name),
      this.transitionsForEntity(partial.name),
      this.businessRulesForEntity(partial.name),
    )
  }

  private businessRulesForEntity(entityName: string): string[] {
    const operations = this.operationsForEntity(entityName)
    const allRules: string[] = []
    for (const operation of operations) {
      if (operation.businessRules === undefined) continue
      allRules.push(...operation.businessRules)
    }
    return [...new Set(allRules)]
  }

  private transitionsForEntity(entityName: string): EntityTransition[] {
    const operations = this.operationsForEntity(entityName)
    const transitions: EntityTransition[] = []
    for (const operation of operations) {
      if (operation.stateChanges === undefined) continue
      for (const stateChange of operation.stateChanges) {
        transitions.push(
          EntityTransition.parse({
            from: State.parse(stateChange.from),
            to: State.parse(stateChange.to),
            triggeredBy: OperationName.parse(operation.operationName),
          }),
        )
      }
    }
    return transitions
  }

  private statesForEntity(entityName: string): State[] {
    const operations = this.operationsForEntity(entityName)
    const states = new Set<string>()
    for (const operation of operations) {
      if (operation.stateChanges === undefined) continue
      for (const stateChange of operation.stateChanges) {
        if (stateChange.from !== '*') states.add(stateChange.from)
        states.add(stateChange.to)
      }
    }
    return this.orderStatesByTransitions(states, operations)
  }

  private orderStatesByTransitions(states: Set<string>, operations: DomainOpComponent[]): State[] {
    const fromStates = new Set<string>()
    const toStates = new Set<string>()
    const transitionMap = new Map<string, string>()
    for (const operation of operations) {
      if (operation.stateChanges === undefined) continue
      for (const transition of operation.stateChanges) {
        if (transition.from !== '*') {
          fromStates.add(transition.from)
          transitionMap.set(transition.from, transition.to)
        }
        toStates.add(transition.to)
      }
    }
    const ordered: State[] = []
    const visited = new Set<string>()
    const follow = (state: string): void => {
      if (visited.has(state)) return
      visited.add(state)
      ordered.push(State.parse(state))
      const next = transitionMap.get(state)
      if (next) follow(next)
    }
    ;[...fromStates].filter((state) => !toStates.has(state)).forEach(follow)
    states.forEach((state) => {
      if (!visited.has(state)) ordered.push(State.parse(state))
    })
    return ordered
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
    const component = this.find((candidate) => candidate.id === startComponentId.value)
    if (component === undefined) {
      throw new ComponentNotFoundError(startComponentId.value)
    }
    return traceFlowFrom(this.graphSnapshot, component)
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
    const entryPoints = findEntryPoints(this.graphSnapshot)
    return queryFlows(this.graphSnapshot, entryPoints)
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
    const trimmedQuery = query.trim().toLowerCase()
    const isEmptyQuery = trimmedQuery === ''

    if (isEmptyQuery) {
      if (options.returnAllOnEmptyQuery) {
        const allIds = this.graphSnapshot.components.map((component) =>
          ComponentId.parse(component.id),
        )
        return SearchWithFlowResult.parse({
          matchingIds: allIds,
          visibleIds: allIds,
        })
      }
      return SearchWithFlowResult.parse({
        matchingIds: [],
        visibleIds: [],
      })
    }

    const matchingComponents = this.search(query)
    if (matchingComponents.length === 0) {
      return SearchWithFlowResult.parse({
        matchingIds: [],
        visibleIds: [],
      })
    }

    const matchingIds = matchingComponents.map((component) => ComponentId.parse(component.id))
    const visibleIds = new Set<ComponentId>()

    for (const component of matchingComponents) {
      const flow = traceFlowFrom(this.graphSnapshot, component)
      for (const id of flow.componentIds) {
        visibleIds.add(id)
      }
    }

    return SearchWithFlowResult.parse({
      matchingIds,
      visibleIds: Array.from(visibleIds),
    })
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
    const entryPoints = findEntryPoints(this.graphSnapshot)
    return queryNodeDepths(this.graphSnapshot, entryPoints)
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
