import type {
  CustomTypeDefinition,
  ExternalLink,
  GraphMetadata,
  RiviereGraph,
  SourceInfo,
} from '@living-architecture/riviere-schema'

/** @riviere-role value-object */
export interface BuilderMetadata extends Omit<GraphMetadata, 'sources' | 'customTypes'> {
  sources: SourceInfo[]
  customTypes: Record<string, CustomTypeDefinition>
}

/** @riviere-role value-object */
export interface BuilderGraph extends Omit<RiviereGraph, 'metadata' | 'externalLinks'> {
  metadata: BuilderMetadata
  externalLinks: ExternalLink[]
}
