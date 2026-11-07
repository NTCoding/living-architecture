import type { TypescriptWorkspaceReader } from '@living-architecture/living-documentation-use-cases/infra/external-clients/typescript/typescript-workspace-reader'
import type { CustomComponent } from '@living-architecture/riviere-schema-published-language/schema'

export type ArchitectureSnapshot = ReturnType<TypescriptWorkspaceReader['readArchitectureSnapshot']>
export type ArchitectureLayerName = keyof ArchitectureSnapshot['subdomains'][number]['layers']
export type ArchitecturePackageKind =
  ArchitectureSnapshot['subdomains'][number]['layers']['domain']['items'][number]['packageKind']
export type ArchitectureItem =
  ArchitectureSnapshot['subdomains'][number]['layers']['domain']['items'][number]
export type ArchitectureAggregate =
  ArchitectureSnapshot['subdomains'][number]['layers']['domain']['aggregates'][number]

export interface GraphArchitectureElement extends CustomComponent {
  readonly aggregateOwnerId?: string
  readonly architectureRole: string
  readonly packageKind: ArchitecturePackageKind
  readonly externalClient?: string
  readonly methods?: readonly string[]
}

export interface IndexedGraphArchitectureElement {
  readonly component: GraphArchitectureElement
  readonly layer: ArchitectureLayerName
}

export class ArchitectureDiffPrototypeError extends Error {}

export const architectureLayerNames: readonly ArchitectureLayerName[] = [
  'entrypoints',
  'use-cases',
  'domain',
]
