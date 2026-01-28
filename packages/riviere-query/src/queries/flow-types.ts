import type {
  Component, ExternalLink 
} from '@living-architecture/riviere-schema'
import type { ComponentId } from './branded-types'

export type LinkType = 'sync' | 'async'

export interface FlowStep {
  component: Component
  linkType: LinkType | undefined
  depth: number
  externalLinks: ExternalLink[]
}

export interface Flow {
  entryPoint: Component
  steps: FlowStep[]
}

export interface SearchWithFlowResult {
  matchingIds: ComponentId[]
  visibleIds: ComponentId[]
}
