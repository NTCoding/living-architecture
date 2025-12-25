import type { RiviereGraph, Component, Link, CustomComponent, ComponentType, DomainOpComponent, EventComponent, EventHandlerComponent } from '@living-architecture/riviere-schema'
import type { Entity, EntityTransition, PublishedEvent, EventSubscriber, EventHandlerInfo, KnownSourceEvent, UnknownSourceEvent } from './event-types'
import type { State, ComponentId, LinkId, ValidationError, ValidationResult, ComponentModification, GraphDiff, Domain, ComponentCounts } from './domain-types'
import { parseEntityName, parseDomainName, parseState, parseOperationName, parseComponentId, parseLinkId, parseEventId, parseEventName, parseHandlerId, parseHandlerName } from './domain-types'
import { parseRiviereGraph } from '@living-architecture/riviere-schema'

export type { Entity, EntityTransition } from './event-types'
export type { ComponentId, LinkId, ValidationErrorCode, ValidationError, ValidationResult, Domain, ComponentCounts, ComponentModification, DiffStats, GraphDiff } from './domain-types'
export { parseComponentId } from './domain-types'

function isCustomComponent(component: Component): component is CustomComponent {
  return component.type === 'Custom'
}

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
    const errors: ValidationError[] = []

    const componentIds = new Set(this.graph.components.map((c) => c.id))
    this.graph.links.forEach((link, index) => {
      if (!componentIds.has(link.source)) {
        errors.push({
          path: `/links/${index}/source`,
          message: `Link references non-existent source: ${link.source}`,
          code: 'INVALID_LINK_SOURCE',
        })
      }
      if (!componentIds.has(link.target)) {
        errors.push({
          path: `/links/${index}/target`,
          message: `Link references non-existent target: ${link.target}`,
          code: 'INVALID_LINK_TARGET',
        })
      }
    })

    errors.push(...this.validateCustomTypes())

    return { valid: errors.length === 0, errors }
  }

  private validateCustomTypes(): ValidationError[] {
    const errors: ValidationError[] = []
    const customTypes = this.graph.metadata.customTypes

    this.graph.components.forEach((component, index) => {
      if (!isCustomComponent(component)) {
        return
      }

      const customTypeName = component.customTypeName

      if (!customTypes || !(customTypeName in customTypes)) {
        errors.push({
          path: `/components/${index}/customTypeName`,
          message: `Custom type '${customTypeName}' is not defined in metadata.customTypes`,
          code: 'INVALID_TYPE',
        })
        return
      }

      const typeDefinition = customTypes[customTypeName]
      if (typeDefinition === undefined || typeDefinition.requiredProperties === undefined) return

      const requiredPropertyNames = Object.keys(typeDefinition.requiredProperties)
      const componentMetadata = component.metadata
      const missingProperties = componentMetadata
        ? requiredPropertyNames.filter((prop) => !(prop in componentMetadata))
        : requiredPropertyNames

      if (missingProperties.length > 0) {
        errors.push({
          path: `/components/${index}`,
          message: `Custom component is missing required properties for type '${customTypeName}': ${missingProperties.join(', ')}`,
          code: 'INVALID_TYPE',
        })
      }
    })

    return errors
  }

  detectOrphans(): ComponentId[] {
    const connectedComponentIds = this.buildConnectedComponentIds()
    return this.graph.components
      .filter((c) => !connectedComponentIds.has(c.id))
      .map((c) => parseComponentId(c.id))
  }

  find(predicate: (component: Component) => boolean): Component | undefined {
    return this.graph.components.find(predicate)
  }

  findAll(predicate: (component: Component) => boolean): Component[] {
    return this.graph.components.filter(predicate)
  }

  componentById(id: ComponentId): Component | undefined {
    return this.find((c) => c.id === id)
  }

  search(query: string): Component[] {
    if (query === '') {
      return []
    }
    const lowerQuery = query.toLowerCase()
    return this.findAll((c) =>
      c.name.toLowerCase().includes(lowerQuery) ||
      c.domain.toLowerCase().includes(lowerQuery) ||
      c.type.toLowerCase().includes(lowerQuery)
    )
  }

  componentsInDomain(domainName: string): Component[] {
    return this.findAll((c) => c.domain === domainName)
  }

  componentsByType(type: ComponentType): Component[] {
    return this.findAll((c) => c.type === type)
  }

  domains(): Domain[] {
    return Object.entries(this.graph.metadata.domains).map(([name, metadata]) => {
      const dc = this.componentsInDomain(name)
      const count = (type: string): number => dc.filter((c) => c.type === type).length
      const componentCounts: ComponentCounts = {
        UI: count('UI'), API: count('API'), UseCase: count('UseCase'), DomainOp: count('DomainOp'),
        Event: count('Event'), EventHandler: count('EventHandler'), Custom: count('Custom'), total: dc.length,
      }
      return { name, description: metadata.description, systemType: metadata.systemType, componentCounts }
    })
  }

  operationsFor(entityName: string): DomainOpComponent[] {
    return this.graph.components.filter((c): c is DomainOpComponent => c.type === 'DomainOp' && c.entity === entityName)
  }

  entities(domainName?: string): Entity[] {
    const domainOps = this.graph.components.filter((c): c is DomainOpComponent & { entity: string } => c.type === 'DomainOp' && c.entity !== undefined)
    const filtered = domainName ? domainOps.filter((op) => op.domain === domainName) : domainOps
    const entityMap = new Map<string, Entity>()
    for (const op of filtered) {
      const key = `${op.domain}:${op.entity}`
      const existing = entityMap.get(key)
      if (existing) {
        entityMap.set(key, { ...existing, operations: [...existing.operations, op] })
      } else {
        entityMap.set(key, { name: parseEntityName(op.entity), domain: parseDomainName(op.domain), operations: [op] })
      }
    }
    return Array.from(entityMap.values())
  }

  businessRulesFor(entityName: string): string[] {
    const operations = this.operationsFor(entityName)
    const allRules: string[] = []
    for (const op of operations) {
      if (op.businessRules === undefined) continue
      allRules.push(...op.businessRules)
    }
    return [...new Set(allRules)]
  }

  transitionsFor(entityName: string): EntityTransition[] {
    const operations = this.operationsFor(entityName)
    const transitions: EntityTransition[] = []
    for (const op of operations) {
      if (op.stateChanges === undefined) continue
      for (const sc of op.stateChanges) {
        transitions.push({ from: parseState(sc.from), to: parseState(sc.to), triggeredBy: parseOperationName(op.operationName) })
      }
    }
    return transitions
  }

  statesFor(entityName: string): State[] {
    const operations = this.operationsFor(entityName)
    const states = new Set<string>()
    for (const op of operations) {
      if (op.stateChanges === undefined) {
        continue
      }
      for (const sc of op.stateChanges) {
        if (sc.from !== '*') states.add(sc.from)
        states.add(sc.to)
      }
    }
    return this.orderStatesByTransitions(states, operations)
  }

  private orderStatesByTransitions(states: Set<string>, operations: DomainOpComponent[]): State[] {
    const fromStates = new Set<string>()
    const toStates = new Set<string>()
    const transitionMap = new Map<string, string>()
    for (const op of operations) {
      if (op.stateChanges === undefined) continue
      for (const t of op.stateChanges) {
        if (t.from !== '*') {
          fromStates.add(t.from)
          transitionMap.set(t.from, t.to)
        }
        toStates.add(t.to)
      }
    }
    const ordered: State[] = []
    const visited = new Set<string>()
    const follow = (s: string): void => {
      if (visited.has(s)) return
      visited.add(s)
      ordered.push(parseState(s))
      const next = transitionMap.get(s)
      if (next) follow(next)
    }
    [...fromStates].filter((s) => !toStates.has(s)).forEach(follow)
    states.forEach((s) => {
      if (!visited.has(s)) ordered.push(parseState(s))
    })
    return ordered
  }

  entryPoints(): Component[] {
    const targets = new Set(this.graph.links.map((link) => link.target))
    const entryPointTypes = new Set<ComponentType>(['UI', 'API', 'EventHandler', 'Custom'])
    return this.graph.components.filter((c) => entryPointTypes.has(c.type) && !targets.has(c.id))
  }

  traceFlow(startComponentId: ComponentId): { componentIds: ComponentId[]; linkIds: LinkId[] } {
    const component = this.componentById(startComponentId)
    if (!component) {
      throw new Error(`Cannot trace flow: component '${startComponentId}' does not exist`)
    }

    const visited = new Set<ComponentId>()
    const visitedLinks = new Set<LinkId>()
    const queue: ComponentId[] = [startComponentId]
    while (queue.length > 0) {
      const currentId = queue.shift()
      if (currentId === undefined || visited.has(currentId)) continue
      visited.add(currentId)
      for (const link of this.graph.links) {
        const sourceId = parseComponentId(link.source)
        const targetId = parseComponentId(link.target)
        if (link.source === currentId && !visited.has(targetId)) {
          queue.push(targetId)
          visitedLinks.add(this.linkKey(link))
        }
        if (link.target === currentId && !visited.has(sourceId)) {
          queue.push(sourceId)
          visitedLinks.add(this.linkKey(link))
        }
      }
    }
    return { componentIds: Array.from(visited), linkIds: Array.from(visitedLinks) }
  }

  private buildConnectedComponentIds(): Set<string> {
    const connected = new Set<string>()
    this.graph.links.forEach((link) => {
      connected.add(link.source)
      connected.add(link.target)
    })
    return connected
  }

  private linkKey(link: Link): LinkId {
    if (link.id !== undefined) {
      return parseLinkId(link.id)
    }
    return parseLinkId(`${link.source}->${link.target}`)
  }

  diff(other: RiviereGraph): GraphDiff {
    const thisIds = new Set(this.graph.components.map((c) => c.id))
    const otherIds = new Set(other.components.map((c) => c.id))
    const otherById = new Map(other.components.map((c) => [c.id, c]))
    const added = other.components.filter((c) => !thisIds.has(c.id))
    const removed = this.graph.components.filter((c) => !otherIds.has(c.id))
    const modified: ComponentModification[] = []
    for (const tc of this.graph.components) {
      const oc = otherById.get(tc.id)
      if (oc === undefined) continue
      const changedFields = this.findChangedFields(tc, oc)
      if (changedFields.length > 0) {
        modified.push({ id: parseComponentId(tc.id), before: tc, after: oc, changedFields })
      }
    }
    const thisLinkKeys = new Set(this.graph.links.map((l) => this.linkKey(l)))
    const otherLinkKeys = new Set(other.links.map((l) => this.linkKey(l)))
    const linksAdded = other.links.filter((l) => !thisLinkKeys.has(this.linkKey(l)))
    const linksRemoved = this.graph.links.filter((l) => !otherLinkKeys.has(this.linkKey(l)))
    return {
      components: { added, removed, modified },
      links: { added: linksAdded, removed: linksRemoved },
      stats: { componentsAdded: added.length, componentsRemoved: removed.length, componentsModified: modified.length, linksAdded: linksAdded.length, linksRemoved: linksRemoved.length },
    }
  }

  private findChangedFields(before: Component, after: Component): string[] {
    const beforeEntries = new Map(Object.entries(before))
    const afterEntries = new Map(Object.entries(after))
    const changedFields: string[] = []
    const allKeys = new Set([...beforeEntries.keys(), ...afterEntries.keys()])
    for (const key of allKeys) {
      if (key === 'id') {
        continue
      }
      if (JSON.stringify(beforeEntries.get(key)) !== JSON.stringify(afterEntries.get(key))) {
        changedFields.push(key)
      }
    }
    return changedFields
  }

  publishedEvents(domainName?: string): PublishedEvent[] {
    const eventComponents = this.graph.components.filter((c): c is EventComponent => c.type === 'Event')
    const filtered = domainName ? eventComponents.filter((e) => e.domain === domainName) : eventComponents
    const handlers = this.graph.components.filter((c): c is EventHandlerComponent => c.type === 'EventHandler')
    return filtered.map((event) => {
      const subscribers: EventSubscriber[] = handlers.filter((h) => h.subscribedEvents.includes(event.eventName))
        .map((h) => ({ handlerId: parseHandlerId(h.id), handlerName: parseHandlerName(h.name), domain: parseDomainName(h.domain) }))
      return { id: parseEventId(event.id), eventName: parseEventName(event.eventName), domain: parseDomainName(event.domain), handlers: subscribers }
    })
  }

  eventHandlers(eventName?: string): EventHandlerInfo[] {
    const eventByName = this.buildEventNameMap()
    const handlers = this.findEventHandlerComponents()
    const filtered = eventName ? handlers.filter((h) => h.subscribedEvents.includes(eventName)) : handlers
    return filtered.map((h) => this.buildEventHandlerInfo(h, eventByName))
  }

  private buildEventNameMap(): Map<string, EventComponent> {
    return new Map(this.graph.components.filter((c): c is EventComponent => c.type === 'Event').map((e) => [e.eventName, e]))
  }

  private findEventHandlerComponents(): EventHandlerComponent[] {
    return this.graph.components.filter((c): c is EventHandlerComponent => c.type === 'EventHandler')
  }

  private buildEventHandlerInfo(handler: EventHandlerComponent, eventByName: Map<string, EventComponent>): EventHandlerInfo {
    const subscribedEventsWithDomain = handler.subscribedEvents.map((name): KnownSourceEvent | UnknownSourceEvent => {
      const event = eventByName.get(name)
      if (event) return { eventName: parseEventName(name), sourceDomain: parseDomainName(event.domain), sourceKnown: true }
      return { eventName: parseEventName(name), sourceKnown: false }
    })
    return { id: parseHandlerId(handler.id), handlerName: parseHandlerName(handler.name), domain: parseDomainName(handler.domain), subscribedEvents: handler.subscribedEvents.map(parseEventName), subscribedEventsWithDomain }
  }
}
