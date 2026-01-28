import type {
  RiviereGraph, Component, ComponentType 
} from '@living-architecture/riviere-schema'
import type { ComponentId } from './branded-types'
import {
  findComponent,
  findAllComponents,
  componentById as lookupComponentById,
  searchComponents as searchComponentsFn,
  componentsInDomain as filterByDomain,
  componentsByType as filterByType,
} from './component-queries'

export class ComponentQueries {
  constructor(private readonly graph: RiviereGraph) {}

  all(): Component[] {
    return this.graph.components
  }

  links() {
    return this.graph.links
  }

  find(predicate: (component: Component) => boolean): Component | undefined {
    return findComponent(this.graph, predicate)
  }

  findAll(predicate: (component: Component) => boolean): Component[] {
    return findAllComponents(this.graph, predicate)
  }

  byId(id: ComponentId): Component | undefined {
    return lookupComponentById(this.graph, id)
  }

  search(query: string): Component[] {
    return searchComponentsFn(this.graph, query)
  }

  inDomain(domainName: string): Component[] {
    return filterByDomain(this.graph, domainName)
  }

  byType(type: ComponentType): Component[] {
    return filterByType(this.graph, type)
  }
}
