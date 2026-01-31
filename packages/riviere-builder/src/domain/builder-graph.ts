import type {
  CustomTypeDefinition,
  ExternalLink,
  GraphMetadata,
  RiviereGraph,
  SourceInfo,
} from '@living-architecture/riviere-schema'

export interface BuilderMetadata extends Omit<GraphMetadata, 'sources' | 'customTypes'> {
  sources: SourceInfo[]
  customTypes: Record<string, CustomTypeDefinition>
}

export interface BuilderGraph extends Omit<RiviereGraph, 'metadata' | 'externalLinks'> {
  metadata: BuilderMetadata
  externalLinks: ExternalLink[]
}
