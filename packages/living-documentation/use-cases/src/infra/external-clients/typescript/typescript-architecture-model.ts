/** @riviere-role external-client-model */
export type TypescriptArchitectureLayerName = 'entrypoints' | 'use-cases' | 'domain'

/** @riviere-role external-client-model */
export type TypescriptArchitecturePackageKind =
  | 'application'
  | 'use-cases'
  | 'domain-model'
  | 'published-language'

/** @riviere-role external-client-model */
export interface TypescriptArchitectureItem {
  readonly name: string
  readonly packageKind: TypescriptArchitecturePackageKind
  readonly role: string
}

/** @riviere-role external-client-model */
export interface TypescriptAggregateSnapshot {
  readonly entities: readonly TypescriptArchitectureItem[]
  readonly methods: readonly string[]
  readonly name: string
  readonly packageKind: TypescriptArchitecturePackageKind
}

/** @riviere-role external-client-model */
export interface TypescriptArchitectureLayerSnapshot {
  readonly aggregates: readonly TypescriptAggregateSnapshot[]
  readonly items: readonly TypescriptArchitectureItem[]
}

/** @riviere-role external-client-model */
export interface TypescriptSubdomainArchitectureSnapshot {
  readonly layers: Readonly<
    Record<TypescriptArchitectureLayerName, TypescriptArchitectureLayerSnapshot>
  >
  readonly name: string
}

/** @riviere-role external-client-model */
export interface TypescriptArchitectureSnapshot {
  readonly subdomains: readonly TypescriptSubdomainArchitectureSnapshot[]
}

/** @riviere-role external-client-error */
export class TypescriptWorkspaceReadError extends Error {
  override readonly name = 'TypescriptWorkspaceReadError'
}
