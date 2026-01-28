import type {
  Component, Link 
} from '@living-architecture/riviere-schema'
import type { ComponentId } from './branded-types'

export interface ComponentModification {
  id: ComponentId
  before: Component
  after: Component
  changedFields: string[]
}

export interface DiffStats {
  componentsAdded: number
  componentsRemoved: number
  componentsModified: number
  linksAdded: number
  linksRemoved: number
}

export interface GraphDiff {
  components: {
    added: Component[]
    removed: Component[]
    modified: ComponentModification[]
  }
  links: {
    added: Link[]
    removed: Link[]
  }
  stats: DiffStats
}
