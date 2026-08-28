type ArchitectureLayerName = 'entrypoints' | 'use-cases' | 'domain'
type ArchitecturePackageKind = 'application' | 'use-cases' | 'domain-model' | 'published-language'

interface ArchitectureItemValue {
  readonly externalClient?: string
  readonly name: string
  readonly packageKind: ArchitecturePackageKind
  readonly relatedTo?: readonly ArchitectureRelationshipValue[]
  readonly role: string
}

interface ArchitectureRelationshipValue {
  readonly name: string
  readonly role: string
}

interface AggregateValue {
  readonly entities: readonly ArchitectureItemValue[]
  readonly methods: readonly string[]
  readonly name: string
  readonly packageKind: ArchitecturePackageKind
}

interface ArchitectureLayerValue {
  readonly aggregates: readonly AggregateValue[]
  readonly items: readonly ArchitectureItemValue[]
}

interface SubdomainArchitectureValue {
  readonly layers: Readonly<Record<ArchitectureLayerName, ArchitectureLayerValue>>
  readonly name: string
}

interface ArchitectureValue {
  readonly subdomains: readonly SubdomainArchitectureValue[]
}

type AggregateChangesValue = AggregateValue

interface ArchitectureChangeSetValue {
  readonly aggregates: readonly AggregateChangesValue[]
  readonly items: readonly ArchitectureItemValue[]
}

interface ArchitectureLayerChangesValue {
  readonly added: ArchitectureChangeSetValue
  readonly removed: ArchitectureChangeSetValue
}

interface SubdomainArchitectureChangesValue {
  readonly change: 'added' | 'changed' | 'removed'
  readonly layers: Readonly<Record<ArchitectureLayerName, ArchitectureLayerChangesValue>>
  readonly name: string
}

interface ArchitectureDiffValue {
  readonly subdomains: readonly SubdomainArchitectureChangesValue[]
}

const layerNames: readonly ArchitectureLayerName[] = ['entrypoints', 'use-cases', 'domain']

/** @riviere-role value-object */
export class ArchitectureSource {
  declare private readonly brand: 'ArchitectureSource'

  private constructor(private readonly value: ArchitectureValue) {}

  static from(value: ArchitectureValue): ArchitectureSource {
    return new ArchitectureSource(copyArchitecture(value))
  }

  snapshot(): ArchitectureValue {
    return copyArchitecture(this.value)
  }
}

/** @riviere-role value-object */
export class Architecture {
  declare private readonly brand: 'Architecture'

  private constructor(private readonly value: ArchitectureValue) {}

  static from(value: ArchitectureValue): Architecture {
    return new Architecture(canonicalArchitecture(value))
  }

  snapshot(): ArchitectureValue {
    return copyArchitecture(this.value)
  }
}

/** @riviere-role value-object */
export class ArchitectureDiff {
  declare private readonly brand: 'ArchitectureDiff'

  private constructor(private readonly value: ArchitectureDiffValue) {}

  static fromArchitectures(base: Architecture, head: Architecture): ArchitectureDiff {
    return new ArchitectureDiff(compareArchitectureValues(base.snapshot(), head.snapshot()))
  }

  changes(): ArchitectureDiffValue {
    return copyArchitectureDiff(this.value)
  }
}

/**
 * @riviere-role domain-service
 * @riviere-role-justification Canonical extraction compares observations across every subdomain and layer, so no single value object naturally owns the transformation.
 */
export function extractArchitecture(source: ArchitectureSource): Architecture {
  return Architecture.from(source.snapshot())
}

function canonicalArchitecture(value: ArchitectureValue): ArchitectureValue {
  const subdomains = new Map<
    string,
    Readonly<Record<ArchitectureLayerName, ArchitectureLayerValue>>
  >()
  for (const subdomain of value.subdomains) {
    const existing = subdomains.get(subdomain.name) ?? emptyLayers()
    subdomains.set(subdomain.name, {
      domain: mergeLayers(existing.domain, subdomain.layers.domain),
      entrypoints: mergeLayers(existing.entrypoints, subdomain.layers.entrypoints),
      'use-cases': mergeLayers(existing['use-cases'], subdomain.layers['use-cases']),
    })
  }
  return {
    subdomains: [...subdomains.entries()]
      .map(([name, layers]) => ({
        layers: {
          domain: canonicalLayer(layers.domain),
          entrypoints: canonicalLayer(layers.entrypoints),
          'use-cases': canonicalLayer(layers['use-cases']),
        },
        name,
      }))
      .toSorted((left, right) => compareText(left.name, right.name)),
  }
}

function mergeLayers(
  left: ArchitectureLayerValue,
  right: ArchitectureLayerValue,
): ArchitectureLayerValue {
  return {
    aggregates: [...left.aggregates, ...right.aggregates],
    items: [...left.items, ...right.items],
  }
}

function canonicalLayer(layer: ArchitectureLayerValue): ArchitectureLayerValue {
  return {
    aggregates: canonicalAggregates(layer.aggregates),
    items: uniqueItems(layer.items),
  }
}

function canonicalAggregates(aggregates: readonly AggregateValue[]): readonly AggregateValue[] {
  const canonical = new Map<string, AggregateValue>()
  for (const aggregate of aggregates) {
    const existing = canonical.get(aggregateKey(aggregate))
    canonical.set(aggregateKey(aggregate), {
      entities: uniqueItems([...(existing?.entities ?? []), ...aggregate.entities]),
      methods: uniqueText([...(existing?.methods ?? []), ...aggregate.methods]),
      name: aggregate.name,
      packageKind: aggregate.packageKind,
    })
  }
  return [...canonical.values()].sort(compareAggregates)
}

function compareArchitectureValues(
  base: ArchitectureValue,
  head: ArchitectureValue,
): ArchitectureDiffValue {
  const baseSubdomains = new Map(base.subdomains.map((subdomain) => [subdomain.name, subdomain]))
  const headSubdomains = new Map(head.subdomains.map((subdomain) => [subdomain.name, subdomain]))
  const subdomainNames = [...new Set([...baseSubdomains.keys(), ...headSubdomains.keys()])].sort(
    compareText,
  )
  const subdomains = subdomainNames.flatMap((name) => {
    const baseSubdomain = baseSubdomains.get(name)
    const headSubdomain = headSubdomains.get(name)
    const baseLayers = baseSubdomain?.layers ?? emptyLayers()
    const headLayers = headSubdomain?.layers ?? emptyLayers()
    const layers: Readonly<Record<ArchitectureLayerName, ArchitectureLayerChangesValue>> = {
      domain: compareLayer(baseLayers.domain, headLayers.domain),
      entrypoints: compareLayer(baseLayers.entrypoints, headLayers.entrypoints),
      'use-cases': compareLayer(baseLayers['use-cases'], headLayers['use-cases']),
    }
    const change = subdomainChange(baseSubdomain, headSubdomain)
    return layerNames.some((layer) => hasLayerChanges(layers[layer]))
      ? [{ change, layers, name }]
      : []
  })
  return { subdomains }
}

function subdomainChange(
  base: SubdomainArchitectureValue | undefined,
  head: SubdomainArchitectureValue | undefined,
): SubdomainArchitectureChangesValue['change'] {
  if (base === undefined) return 'added'
  if (head === undefined) return 'removed'
  return 'changed'
}

function compareLayer(
  base: ArchitectureLayerValue,
  head: ArchitectureLayerValue,
): ArchitectureLayerChangesValue {
  const aggregateChanges = compareAggregateCollections(base.aggregates, head.aggregates)
  return {
    added: { aggregates: aggregateChanges.added, items: addedItems(base.items, head.items) },
    removed: { aggregates: aggregateChanges.removed, items: addedItems(head.items, base.items) },
  }
}

function compareAggregateCollections(
  base: readonly AggregateValue[],
  head: readonly AggregateValue[],
): Readonly<{
  added: readonly AggregateChangesValue[]
  removed: readonly AggregateChangesValue[]
}> {
  const baseAggregates = new Map(base.map((aggregate) => [aggregateKey(aggregate), aggregate]))
  const headAggregates = new Map(head.map((aggregate) => [aggregateKey(aggregate), aggregate]))
  const added = head.flatMap((aggregate) => {
    const previous = baseAggregates.get(aggregateKey(aggregate))
    return previous === undefined
      ? [copyAggregate(aggregate)]
      : changedAggregateMembers(previous, aggregate)
  })
  const removed = base.flatMap((aggregate) => {
    const current = headAggregates.get(aggregateKey(aggregate))
    return current === undefined
      ? [copyAggregate(aggregate)]
      : changedAggregateMembers(current, aggregate)
  })
  return {
    added: added.toSorted(compareAggregates),
    removed: removed.toSorted(compareAggregates),
  }
}

function changedAggregateMembers(
  base: AggregateValue,
  head: AggregateValue,
): readonly AggregateChangesValue[] {
  const entities = addedItems(base.entities, head.entities)
  const methods = addedText(base.methods, head.methods)
  return entities.length === 0 && methods.length === 0
    ? []
    : [{ entities, methods, name: head.name, packageKind: head.packageKind }]
}

function addedItems(
  base: readonly ArchitectureItemValue[],
  head: readonly ArchitectureItemValue[],
): readonly ArchitectureItemValue[] {
  const existing = new Set(base.map(itemKey))
  return head.filter((item) => !existing.has(itemKey(item))).map(copyItem)
}

function addedText(base: readonly string[], head: readonly string[]): readonly string[] {
  const existing = new Set(base)
  return head.filter((item) => !existing.has(item)).toSorted(compareText)
}

function hasLayerChanges(changes: ArchitectureLayerChangesValue): boolean {
  return hasChangeSetChanges(changes.added) || hasChangeSetChanges(changes.removed)
}

function hasChangeSetChanges(changes: ArchitectureChangeSetValue): boolean {
  return changes.aggregates.length > 0 || changes.items.length > 0
}

function emptyLayers(): Readonly<Record<ArchitectureLayerName, ArchitectureLayerValue>> {
  return {
    domain: { aggregates: [], items: [] },
    entrypoints: { aggregates: [], items: [] },
    'use-cases': { aggregates: [], items: [] },
  }
}

function uniqueItems(items: readonly ArchitectureItemValue[]): readonly ArchitectureItemValue[] {
  const unique = new Map(items.map((item) => [itemKey(item), copyItem(item)]))
  return [...unique.values()].sort(compareItems)
}

function uniqueText(items: readonly string[]): readonly string[] {
  return [...new Set(items)].sort(compareText)
}

function copyArchitecture(value: ArchitectureValue): ArchitectureValue {
  return {
    subdomains: value.subdomains.map((subdomain) => ({
      layers: {
        domain: copyLayer(subdomain.layers.domain),
        entrypoints: copyLayer(subdomain.layers.entrypoints),
        'use-cases': copyLayer(subdomain.layers['use-cases']),
      },
      name: subdomain.name,
    })),
  }
}

function copyLayer(layer: ArchitectureLayerValue): ArchitectureLayerValue {
  return {
    aggregates: layer.aggregates.map(copyAggregate),
    items: layer.items.map(copyItem),
  }
}

function copyAggregate(aggregate: AggregateValue): AggregateValue {
  return {
    entities: aggregate.entities.map(copyItem),
    methods: [...aggregate.methods],
    name: aggregate.name,
    packageKind: aggregate.packageKind,
  }
}

function copyItem(item: ArchitectureItemValue): ArchitectureItemValue {
  const relatedTo = canonicalRelationships(item.relatedTo ?? [])
  return {
    ...(item.externalClient === undefined ? {} : { externalClient: item.externalClient }),
    name: item.name,
    packageKind: item.packageKind,
    ...(relatedTo.length === 0 ? {} : { relatedTo }),
    role: item.role,
  }
}

function copyArchitectureDiff(value: ArchitectureDiffValue): ArchitectureDiffValue {
  return {
    subdomains: value.subdomains.map((subdomain) => ({
      change: subdomain.change,
      layers: {
        domain: copyLayerChanges(subdomain.layers.domain),
        entrypoints: copyLayerChanges(subdomain.layers.entrypoints),
        'use-cases': copyLayerChanges(subdomain.layers['use-cases']),
      },
      name: subdomain.name,
    })),
  }
}

function copyLayerChanges(changes: ArchitectureLayerChangesValue): ArchitectureLayerChangesValue {
  return {
    added: copyChangeSet(changes.added),
    removed: copyChangeSet(changes.removed),
  }
}

function copyChangeSet(changes: ArchitectureChangeSetValue): ArchitectureChangeSetValue {
  return {
    aggregates: changes.aggregates.map(copyAggregate),
    items: changes.items.map(copyItem),
  }
}

function aggregateKey(aggregate: AggregateValue): string {
  return `${aggregate.packageKind}:${aggregate.name}`
}

function itemKey(item: ArchitectureItemValue): string {
  const externalClient =
    item.externalClient === undefined ? ([false] as const) : ([true, item.externalClient] as const)
  const relationships = canonicalRelationships(item.relatedTo ?? []).map(relationshipKey)
  return JSON.stringify([item.packageKind, item.role, item.name, externalClient, relationships])
}

function canonicalRelationships(
  relationships: readonly ArchitectureRelationshipValue[],
): readonly ArchitectureRelationshipValue[] {
  const unique = new Map(
    relationships.map((relationship) => [
      relationshipKey(relationship),
      { name: relationship.name, role: relationship.role },
    ]),
  )
  return [...unique.values()].sort((left, right) =>
    compareText(relationshipKey(left), relationshipKey(right)),
  )
}

function relationshipKey(relationship: ArchitectureRelationshipValue): string {
  return JSON.stringify([relationship.role, relationship.name])
}

function compareAggregates(left: AggregateValue, right: AggregateValue): number {
  return compareText(aggregateKey(left), aggregateKey(right))
}

function compareItems(left: ArchitectureItemValue, right: ArchitectureItemValue): number {
  return compareText(left.name, right.name) || compareText(itemKey(left), itemKey(right))
}

function compareText(left: string, right: string): number {
  return left.localeCompare(right, 'en')
}
