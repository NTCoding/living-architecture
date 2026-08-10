import type {
  CustomTypeDefinition,
  ExternalLink,
  GraphMetadata,
  RiviereGraph,
  SourceInfo,
  RelationshipTypeDefinition,
} from '@living-architecture/riviere-schema'

/** @riviere-role value-object */
export interface BuilderMetadata extends Omit<
  GraphMetadata,
  'sources' | 'customTypes' | 'relationshipTypes'
> {
  sources: SourceInfo[]
  customTypes: Record<string, CustomTypeDefinition>
  relationshipTypes: Record<string, RelationshipTypeDefinition>
}

/** @riviere-role value-object */
export interface BuilderGraph extends Omit<RiviereGraph, 'metadata' | 'externalLinks'> {
  metadata: BuilderMetadata
  externalLinks: ExternalLink[]
}
