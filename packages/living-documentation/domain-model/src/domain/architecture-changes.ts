type ArchitectureLayerName = 'entrypoints' | 'use-cases' | 'domain'
type ArchitecturePackageKind = 'application' | 'use-cases' | 'domain-model' | 'published-language'
type ArchitectureSubdomainChange = 'added' | 'changed' | 'removed'

interface ArchitectureRelationshipValue {
  readonly name: string
  readonly role: string
}

interface ArchitectureItemValue {
  readonly externalClient?: string
  readonly name: string
  readonly packageKind: ArchitecturePackageKind
  readonly relatedTo?: readonly ArchitectureRelationshipValue[]
  readonly role: string
}

interface AggregateChangesValue {
  readonly entities: readonly ArchitectureItemValue[]
  readonly methods: readonly string[]
  readonly name: string
  readonly packageKind: ArchitecturePackageKind
}

interface ArchitectureChangeSetValue {
  readonly aggregates: readonly AggregateChangesValue[]
  readonly items: readonly ArchitectureItemValue[]
}

interface ArchitectureLayerChangesValue {
  readonly added: ArchitectureChangeSetValue
  readonly removed: ArchitectureChangeSetValue
}

interface SubdomainArchitectureChangesValue {
  readonly change: ArchitectureSubdomainChange
  readonly layers: Readonly<Record<ArchitectureLayerName, ArchitectureLayerChangesValue>>
  readonly name: string
}

interface ArchitectureDiffValue {
  readonly subdomains: readonly SubdomainArchitectureChangesValue[]
}

/** @riviere-role value-object */
export class ArchitectureRelationship {
  declare private readonly brand: 'ArchitectureRelationship'

  private constructor(
    readonly name: string,
    readonly role: string,
  ) {}

  static from(value: ArchitectureRelationshipValue): ArchitectureRelationship {
    return new ArchitectureRelationship(value.name, value.role)
  }

  snapshot(): ArchitectureRelationshipValue {
    return { name: this.name, role: this.role }
  }
}

/** @riviere-role value-object */
export class ArchitectureItem {
  declare private readonly brand: 'ArchitectureItem'

  private constructor(
    readonly name: string,
    readonly role: string,
    readonly packageKind: ArchitecturePackageKind,
    readonly externalClient: string | undefined,
    readonly relatedTo: readonly ArchitectureRelationship[],
  ) {}

  static from(value: ArchitectureItemValue): ArchitectureItem {
    return new ArchitectureItem(
      value.name,
      value.role,
      value.packageKind,
      value.externalClient,
      (value.relatedTo ?? []).map(ArchitectureRelationship.from),
    )
  }

  snapshot(): ArchitectureItemValue {
    const relatedTo = this.relatedTo.map((relationship) => relationship.snapshot())
    return {
      ...(this.externalClient === undefined ? {} : { externalClient: this.externalClient }),
      name: this.name,
      packageKind: this.packageKind,
      ...(relatedTo.length === 0 ? {} : { relatedTo }),
      role: this.role,
    }
  }
}

/** @riviere-role value-object */
export class ArchitectureAggregateChanges {
  declare private readonly brand: 'ArchitectureAggregateChanges'

  private constructor(
    readonly name: string,
    readonly packageKind: ArchitecturePackageKind,
    readonly methods: readonly string[],
    readonly entities: readonly ArchitectureItem[],
  ) {}

  static from(value: AggregateChangesValue): ArchitectureAggregateChanges {
    return new ArchitectureAggregateChanges(
      value.name,
      value.packageKind,
      [...value.methods],
      value.entities.map(ArchitectureItem.from),
    )
  }

  snapshot(): AggregateChangesValue {
    return {
      entities: this.entities.map((entity) => entity.snapshot()),
      methods: [...this.methods],
      name: this.name,
      packageKind: this.packageKind,
    }
  }
}

/** @riviere-role value-object */
export class ArchitectureChangeSet {
  declare private readonly brand: 'ArchitectureChangeSet'

  private constructor(
    readonly aggregates: readonly ArchitectureAggregateChanges[],
    readonly items: readonly ArchitectureItem[],
  ) {}

  static from(value: ArchitectureChangeSetValue): ArchitectureChangeSet {
    return new ArchitectureChangeSet(
      value.aggregates.map(ArchitectureAggregateChanges.from),
      value.items.map(ArchitectureItem.from),
    )
  }

  snapshot(): ArchitectureChangeSetValue {
    return {
      aggregates: this.aggregates.map((aggregate) => aggregate.snapshot()),
      items: this.items.map((item) => item.snapshot()),
    }
  }
}

/** @riviere-role value-object */
export class ArchitectureLayerChanges {
  declare private readonly brand: 'ArchitectureLayerChanges'

  private constructor(
    readonly added: ArchitectureChangeSet,
    readonly removed: ArchitectureChangeSet,
  ) {}

  static from(value: ArchitectureLayerChangesValue): ArchitectureLayerChanges {
    return new ArchitectureLayerChanges(
      ArchitectureChangeSet.from(value.added),
      ArchitectureChangeSet.from(value.removed),
    )
  }

  snapshot(): ArchitectureLayerChangesValue {
    return { added: this.added.snapshot(), removed: this.removed.snapshot() }
  }
}

/** @riviere-role value-object */
export class SubdomainArchitectureChanges {
  declare private readonly brand: 'SubdomainArchitectureChanges'

  private constructor(
    readonly name: string,
    readonly change: ArchitectureSubdomainChange,
    readonly layers: Readonly<Record<ArchitectureLayerName, ArchitectureLayerChanges>>,
  ) {}

  static from(value: SubdomainArchitectureChangesValue): SubdomainArchitectureChanges {
    return new SubdomainArchitectureChanges(value.name, value.change, {
      domain: ArchitectureLayerChanges.from(value.layers.domain),
      entrypoints: ArchitectureLayerChanges.from(value.layers.entrypoints),
      'use-cases': ArchitectureLayerChanges.from(value.layers['use-cases']),
    })
  }

  snapshot(): SubdomainArchitectureChangesValue {
    return {
      change: this.change,
      layers: {
        domain: this.layers.domain.snapshot(),
        entrypoints: this.layers.entrypoints.snapshot(),
        'use-cases': this.layers['use-cases'].snapshot(),
      },
      name: this.name,
    }
  }
}

/** @riviere-role value-object */
export class ArchitectureChanges {
  declare private readonly brand: 'ArchitectureChanges'

  private constructor(readonly subdomains: readonly SubdomainArchitectureChanges[]) {}

  static from(value: ArchitectureDiffValue): ArchitectureChanges {
    return new ArchitectureChanges(value.subdomains.map(SubdomainArchitectureChanges.from))
  }

  snapshot(): ArchitectureDiffValue {
    return { subdomains: this.subdomains.map((subdomain) => subdomain.snapshot()) }
  }
}
