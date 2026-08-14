import type {
  DomainOpComponent,
  RiviereGraph,
} from '@living-architecture/riviere-schema-published-language/schema'
import { compareByCodePoint } from './compare-by-code-point'
import { ComponentCounts } from './component-counts'
import { componentsInDomain } from './component-queries'
import { Domain } from './domain'
import { DomainName } from './domain-name'
import { Entity } from './entity'
import { EntityName } from './entity-name'
import { EntityTransition } from './entity-transition'
import { OperationName } from './operation-name'
import { State } from './state'

/** @riviere-role domain-service */
export function queryDomains(graph: RiviereGraph): Domain[] {
  return Object.entries(graph.metadata.domains).map(([name, metadata]) => {
    const dc = componentsInDomain(graph, name)
    const count = (type: string): number => dc.filter((c) => c.type === type).length
    const componentCounts: ComponentCounts = ComponentCounts.parse({
      UI: count('UI'),
      API: count('API'),
      UseCase: count('UseCase'),
      DomainOp: count('DomainOp'),
      Event: count('Event'),
      EventHandler: count('EventHandler'),
      Custom: count('Custom'),
      total: dc.length,
    })
    return Domain.parse({
      name,
      description: metadata.description,
      systemType: metadata.systemType,
      componentCounts,
    })
  })
}

/** @riviere-role domain-service */
export function operationsForEntity(graph: RiviereGraph, entityName: string): DomainOpComponent[] {
  return graph.components.filter(
    (c): c is DomainOpComponent => c.type === 'DomainOp' && c.entity === entityName,
  )
}

interface PartialEntity {
  name: string
  domain: string
  operations: DomainOpComponent[]
}

/** @riviere-role domain-service */
export function queryEntities(graph: RiviereGraph, domainName?: string): Entity[] {
  const domainOps = graph.components.filter(
    (c): c is DomainOpComponent & { entity: string } =>
      c.type === 'DomainOp' && c.entity !== undefined,
  )
  const filtered = domainName ? domainOps.filter((op) => op.domain === domainName) : domainOps
  const entityMap = new Map<string, PartialEntity>()
  for (const op of filtered) {
    const key = `${op.domain}:${op.entity}`
    const existing = entityMap.get(key)
    if (existing === undefined) {
      entityMap.set(key, {
        name: op.entity,
        domain: op.domain,
        operations: [op],
      })
    } else {
      entityMap.set(key, {
        ...existing,
        operations: [...existing.operations, op],
      })
    }
  }
  return Array.from(entityMap.values())
    .sort((a, b) => compareByCodePoint(a.name, b.name))
    .map((partial) => createEntity(graph, partial))
}

function createEntity(graph: RiviereGraph, partial: PartialEntity): Entity {
  const sortedOperations = [...partial.operations].sort((a, b) =>
    compareByCodePoint(a.operationName, b.operationName),
  )
  return Entity.parse(
    EntityName.parse(partial.name),
    DomainName.parse(partial.domain),
    sortedOperations,
    statesForEntity(graph, partial.name),
    transitionsForEntity(graph, partial.name),
    businessRulesForEntity(graph, partial.name),
  )
}

/** @riviere-role domain-service */
export function businessRulesForEntity(graph: RiviereGraph, entityName: string): string[] {
  const operations = operationsForEntity(graph, entityName)
  const allRules: string[] = []
  for (const op of operations) {
    if (op.businessRules === undefined) continue
    allRules.push(...op.businessRules)
  }
  return [...new Set(allRules)]
}

/** @riviere-role domain-service */
export function transitionsForEntity(graph: RiviereGraph, entityName: string): EntityTransition[] {
  const operations = operationsForEntity(graph, entityName)
  const transitions: EntityTransition[] = []
  for (const op of operations) {
    if (op.stateChanges === undefined) continue
    for (const sc of op.stateChanges) {
      transitions.push(
        EntityTransition.parse({
          from: State.parse(sc.from),
          to: State.parse(sc.to),
          triggeredBy: OperationName.parse(op.operationName),
        }),
      )
    }
  }
  return transitions
}

/** @riviere-role domain-service */
export function statesForEntity(graph: RiviereGraph, entityName: string): State[] {
  const operations = operationsForEntity(graph, entityName)
  const states = new Set<string>()
  for (const op of operations) {
    if (op.stateChanges === undefined) continue
    for (const sc of op.stateChanges) {
      if (sc.from !== '*') states.add(sc.from)
      states.add(sc.to)
    }
  }
  return orderStatesByTransitions(states, operations)
}

function orderStatesByTransitions(states: Set<string>, operations: DomainOpComponent[]): State[] {
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
    ordered.push(State.parse(s))
    const next = transitionMap.get(s)
    if (next) follow(next)
  }
  ;[...fromStates].filter((s) => !toStates.has(s)).forEach(follow)
  states.forEach((s) => {
    if (!visited.has(s)) ordered.push(State.parse(s))
  })
  return ordered
}
