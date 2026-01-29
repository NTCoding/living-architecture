import type {
  ExternalTarget, LinkType, SourceLocation 
} from '@living-architecture/riviere-schema'

export interface LinkInput {
  from: string
  to: string
  type?: LinkType
}

export interface ExternalLinkInput {
  from: string
  target: ExternalTarget
  type?: LinkType
  description?: string
  sourceLocation?: SourceLocation
  metadata?: Record<string, unknown>
}
