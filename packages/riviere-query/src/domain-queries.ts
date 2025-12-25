import type { RiviereGraph, DomainOpComponent } from '@living-architecture/riviere-schema'
import type { Entity, EntityTransition } from './event-types'
import type { State, Domain, ComponentCounts } from './domain-types'
import { parseEntityName, parseDomainName, parseState, parseOperationName } from './domain-types'
import { componentsInDomain } from './component-queries'

export function queryDomains(graph: RiviereGraph): Domain[] {
  return Object.entries(graph.metadata.domains).map(([name, metadata]) => {
    const dc = componentsInDomain(graph, name)
    const count = (type: string): number => dc.filter((c) => c.type === type).length
    const componentCounts: ComponentCounts = {
      UI: count('UI'), API: count('API'), UseCase: count('UseCase'), DomainOp: count('DomainOp'),
      Event: count('Event'), EventHandler: count('EventHandler'), Custom: count('Custom'), total: dc.length,
    }
    return { name, description: metadata.description, systemType: metadata.systemType, componentCounts }
  })
}

export function operationsForEntity(graph: RiviereGraph, entityName: string): DomainOpComponent[] {
  return graph.components.filter((c): c is DomainOpComponent => c.type === 'DomainOp' && c.entity === entityName)
}

export function queryEntities(graph: RiviereGraph, domainName?: string): Entity[] {
  const domainOps = graph.components.filter((c): c is DomainOpComponent & { entity: string } => c.type === 'DomainOp' && c.entity !== undefined)
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

export function businessRulesForEntity(graph: RiviereGraph, entityName: string): string[] {
  const operations = operationsForEntity(graph, entityName)
  const allRules: string[] = []
  for (const op of operations) {
    if (op.businessRules === undefined) continue
    allRules.push(...op.businessRules)
  }
  return [...new Set(allRules)]
}

export function transitionsForEntity(graph: RiviereGraph, entityName: string): EntityTransition[] {
  const operations = operationsForEntity(graph, entityName)
  const transitions: EntityTransition[] = []
  for (const op of operations) {
    if (op.stateChanges === undefined) continue
    for (const sc of op.stateChanges) {
      transitions.push({ from: parseState(sc.from), to: parseState(sc.to), triggeredBy: parseOperationName(op.operationName) })
    }
  }
  return transitions
}

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
    ordered.push(parseState(s))
    const next = transitionMap.get(s)
    if (next) follow(next)
  }
  ;[...fromStates].filter((s) => !toStates.has(s)).forEach(follow)
  states.forEach((s) => {
    if (!visited.has(s)) ordered.push(parseState(s))
  })
  return ordered
}
