export type ArchitectureLayerName = 'entrypoints' | 'use-cases' | 'domain'
export type ArchitecturePackageKind =
  | 'application'
  | 'use-cases'
  | 'domain-model'
  | 'published-language'

export interface ArchitectureItem {
  readonly name: string
  readonly packageKind: ArchitecturePackageKind
  readonly role: string
}

export interface AggregateSnapshot {
  readonly entities: readonly ArchitectureItem[]
  readonly methods: readonly string[]
  readonly name: string
  readonly packageKind: ArchitecturePackageKind
}

export interface ArchitectureLayerSnapshot {
  readonly aggregates: readonly AggregateSnapshot[]
  readonly items: readonly ArchitectureItem[]
}

export interface SubdomainArchitectureSnapshot {
  readonly layers: Readonly<Record<ArchitectureLayerName, ArchitectureLayerSnapshot>>
  readonly name: string
}

export interface ArchitectureSnapshot {
  readonly subdomains: readonly SubdomainArchitectureSnapshot[]
}

export class ArchitectureReviewSourceError extends Error {
  override readonly name = 'ArchitectureReviewSourceError'
}
