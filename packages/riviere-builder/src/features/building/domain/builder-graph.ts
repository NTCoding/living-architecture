import type {
  CustomTypeDefinition,
  ExternalLink,
  GraphMetadata,
  RiviereGraph,
  SourceInfo,
} from '@living-architecture/riviere-schema'

/** @riviere-role query-model */
export interface BuilderMetadata extends Omit<GraphMetadata, 'sources' | 'customTypes'> {
  sources: SourceInfo[]
  customTypes: Record<string, CustomTypeDefinition>
}

/** @riviere-role query-model */
export interface BuilderGraph extends Omit<RiviereGraph, 'metadata' | 'externalLinks'> {
  metadata: BuilderMetadata
  externalLinks: ExternalLink[]
}
