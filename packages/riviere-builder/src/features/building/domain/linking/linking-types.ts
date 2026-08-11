import type {
  ExternalTarget, LinkType, SourceLocation 
} from '@living-architecture/riviere-schema'

/** @riviere-role value-object */
export interface LinkInput {
  from: string
  to: string
  type?: LinkType
  relationshipType?: string
  condition?: string
  sourceLocation?: SourceLocation
}

/** @riviere-role value-object */
export interface ExternalLinkInput {
  from: string
  target: ExternalTarget
  type?: LinkType
  description?: string
  sourceLocation?: SourceLocation
  metadata?: Record<string, unknown>
}
