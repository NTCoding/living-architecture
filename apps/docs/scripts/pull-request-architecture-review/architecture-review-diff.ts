import type {
  AggregateSnapshot,
  ArchitectureItem,
  ArchitectureLayerName,
  ArchitectureLayerSnapshot,
  ArchitectureSnapshot,
} from './architecture-review-types'
import { compareText, itemKey } from './typescript-architecture-source'

export interface AggregateChanges {
  readonly entities: readonly ArchitectureItem[]
  readonly methods: readonly string[]
  readonly name: string
  readonly packageKind: AggregateSnapshot['packageKind']
}

export interface ArchitectureChangeSet {
  readonly aggregates: readonly AggregateChanges[]
  readonly items: readonly ArchitectureItem[]
}

export interface ArchitectureLayerChanges {
  readonly added: ArchitectureChangeSet
  readonly removed: ArchitectureChangeSet
}

export interface SubdomainArchitectureChanges {
  readonly layers: Readonly<Record<ArchitectureLayerName, ArchitectureLayerChanges>>
  readonly name: string
}

export interface PullRequestArchitectureChanges {
  readonly subdomains: readonly SubdomainArchitectureChanges[]
}

const layerNames: readonly ArchitectureLayerName[] = ['entrypoints', 'use-cases', 'domain']

export function compareArchitecture(
  base: ArchitectureSnapshot,
  head: ArchitectureSnapshot,
): PullRequestArchitectureChanges {
  const baseSubdomains = new Map(base.subdomains.map((subdomain) => [subdomain.name, subdomain]))
  const headSubdomains = new Map(head.subdomains.map((subdomain) => [subdomain.name, subdomain]))
  const subdomainNames = [...new Set([...baseSubdomains.keys(), ...headSubdomains.keys()])].sort(
    compareText,
  )
  const subdomains = subdomainNames.flatMap((name) => {
    const baseLayers = baseSubdomains.get(name)?.layers ?? emptyLayers()
    const headLayers = headSubdomains.get(name)?.layers ?? emptyLayers()
    const layers: Readonly<Record<ArchitectureLayerName, ArchitectureLayerChanges>> = {
      domain: compareLayer(baseLayers.domain, headLayers.domain),
      entrypoints: compareLayer(baseLayers.entrypoints, headLayers.entrypoints),
      'use-cases': compareLayer(baseLayers['use-cases'], headLayers['use-cases']),
    }
    return layerNames.some((layer) => hasLayerChanges(layers[layer])) ? [{ layers, name }] : []
  })
  return { subdomains }
}

export function hasChangeSetChanges(changes: ArchitectureChangeSet): boolean {
  return changes.aggregates.length > 0 || changes.items.length > 0
}

export function hasLayerChanges(changes: ArchitectureLayerChanges): boolean {
  return hasChangeSetChanges(changes.added) || hasChangeSetChanges(changes.removed)
}

function compareLayer(
  base: ArchitectureLayerSnapshot,
  head: ArchitectureLayerSnapshot,
): ArchitectureLayerChanges {
  const aggregateChanges = compareAggregates(base.aggregates, head.aggregates)
  return {
    added: {
      aggregates: aggregateChanges.added,
      items: addedItems(base.items, head.items),
    },
    removed: {
      aggregates: aggregateChanges.removed,
      items: addedItems(head.items, base.items),
    },
  }
}

function compareAggregates(
  base: readonly AggregateSnapshot[],
  head: readonly AggregateSnapshot[],
): Readonly<{ added: readonly AggregateChanges[]; removed: readonly AggregateChanges[] }> {
  const baseAggregates = new Map(base.map((aggregate) => [aggregateKey(aggregate), aggregate]))
  const headAggregates = new Map(head.map((aggregate) => [aggregateKey(aggregate), aggregate]))
  const added = head.flatMap((aggregate) => {
    const previous = baseAggregates.get(aggregateKey(aggregate))
    return previous === undefined
      ? [wholeAggregate(aggregate)]
      : internalAggregateChanges(previous, aggregate)
  })
  const removed = base.flatMap((aggregate) => {
    const current = headAggregates.get(aggregateKey(aggregate))
    return current === undefined
      ? [wholeAggregate(aggregate)]
      : internalAggregateChanges(current, aggregate)
  })
  return {
    added: added.toSorted(compareAggregatesByName),
    removed: removed.toSorted(compareAggregatesByName),
  }
}

function internalAggregateChanges(
  base: AggregateSnapshot,
  head: AggregateSnapshot,
): readonly AggregateChanges[] {
  const entities = addedItems(base.entities, head.entities)
  const methods = addedText(base.methods, head.methods)
  return entities.length === 0 && methods.length === 0
    ? []
    : [{ entities, methods, name: head.name, packageKind: head.packageKind }]
}

function wholeAggregate(aggregate: AggregateSnapshot): AggregateChanges {
  return {
    entities: aggregate.entities,
    methods: aggregate.methods,
    name: aggregate.name,
    packageKind: aggregate.packageKind,
  }
}

function addedItems(
  base: readonly ArchitectureItem[],
  head: readonly ArchitectureItem[],
): readonly ArchitectureItem[] {
  const existing = new Set(base.map(itemKey))
  return head.filter((item) => !existing.has(itemKey(item)))
}

function addedText(base: readonly string[], head: readonly string[]): readonly string[] {
  const existing = new Set(base)
  return head.filter((item) => !existing.has(item)).toSorted(compareText)
}

function aggregateKey(aggregate: AggregateSnapshot): string {
  return `${aggregate.packageKind}:${aggregate.name}`
}

function compareAggregatesByName(left: AggregateChanges, right: AggregateChanges): number {
  return compareText(`${left.packageKind}:${left.name}`, `${right.packageKind}:${right.name}`)
}

function emptyLayer(): ArchitectureLayerSnapshot {
  return { aggregates: [], items: [] }
}

function emptyLayers(): Readonly<Record<ArchitectureLayerName, ArchitectureLayerSnapshot>> {
  return {
    domain: emptyLayer(),
    entrypoints: emptyLayer(),
    'use-cases': emptyLayer(),
  }
}
