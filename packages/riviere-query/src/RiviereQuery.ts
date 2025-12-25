import type { RiviereGraph, Component, Link, CustomComponent, ComponentType } from '@living-architecture/riviere-schema'
import { parseRiviereGraph } from '@living-architecture/riviere-schema'

export type ValidationErrorCode =
  | 'INVALID_LINK_SOURCE'
  | 'INVALID_LINK_TARGET'
  | 'INVALID_TYPE'

export interface ValidationError {
  path: string
  message: string
  code: ValidationErrorCode
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

export interface ComponentModification {
  id: string
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

function isCustomComponent(component: Component): component is CustomComponent {
  return component.type === 'Custom'
}

function assertValidGraph(graph: unknown): asserts graph is RiviereGraph {
  parseRiviereGraph(graph)
}

export class RiviereQuery {
  private readonly graph: RiviereGraph

  constructor(graph: RiviereGraph) {
    assertValidGraph(graph)
    this.graph = graph
  }

  static fromJSON(json: unknown): RiviereQuery {
    assertValidGraph(json)
    return new RiviereQuery(json)
  }

  components(): Component[] {
    return this.graph.components
  }

  links(): Link[] {
    return this.graph.links
  }

  validate(): ValidationResult {
    const errors: ValidationError[] = []

    const componentIds = new Set(this.graph.components.map((c) => c.id))
    this.graph.links.forEach((link, index) => {
      if (!componentIds.has(link.source)) {
        errors.push({
          path: `/links/${index}/source`,
          message: `Link references non-existent source: ${link.source}`,
          code: 'INVALID_LINK_SOURCE',
        })
      }
      if (!componentIds.has(link.target)) {
        errors.push({
          path: `/links/${index}/target`,
          message: `Link references non-existent target: ${link.target}`,
          code: 'INVALID_LINK_TARGET',
        })
      }
    })

    errors.push(...this.validateCustomTypes())

    return { valid: errors.length === 0, errors }
  }

  private validateCustomTypes(): ValidationError[] {
    const errors: ValidationError[] = []
    const customTypes = this.graph.metadata.customTypes

    this.graph.components.forEach((component, index) => {
      if (!isCustomComponent(component)) {
        return
      }

      const customTypeName = component.customTypeName

      if (!customTypes || !(customTypeName in customTypes)) {
        errors.push({
          path: `/components/${index}/customTypeName`,
          message: `Custom type '${customTypeName}' is not defined in metadata.customTypes`,
          code: 'INVALID_TYPE',
        })
        return
      }

      const typeDefinition = customTypes[customTypeName]
      if (!typeDefinition || !typeDefinition.requiredProperties) {
        return
      }

      const requiredPropertyNames = Object.keys(typeDefinition.requiredProperties)
      const componentMetadata = component.metadata
      const missingProperties = componentMetadata
        ? requiredPropertyNames.filter((prop) => !(prop in componentMetadata))
        : requiredPropertyNames

      if (missingProperties.length > 0) {
        errors.push({
          path: `/components/${index}`,
          message: `Custom component is missing required properties for type '${customTypeName}': ${missingProperties.join(', ')}`,
          code: 'INVALID_TYPE',
        })
      }
    })

    return errors
  }

  detectOrphans(): string[] {
    const connectedComponentIds = this.buildConnectedComponentIds()
    return this.graph.components
      .filter((c) => !connectedComponentIds.has(c.id))
      .map((c) => c.id)
  }

  find(predicate: (component: Component) => boolean): Component | undefined {
    return this.graph.components.find(predicate)
  }

  findAll(predicate: (component: Component) => boolean): Component[] {
    return this.graph.components.filter(predicate)
  }

  componentById(id: string): Component | undefined {
    return this.find((c) => c.id === id)
  }

  search(query: string): Component[] {
    if (query === '') {
      return []
    }
    const lowerQuery = query.toLowerCase()
    return this.findAll((c) =>
      c.name.toLowerCase().includes(lowerQuery) ||
      c.domain.toLowerCase().includes(lowerQuery) ||
      c.type.toLowerCase().includes(lowerQuery)
    )
  }

  componentsInDomain(domainName: string): Component[] {
    return this.findAll((c) => c.domain === domainName)
  }

  componentsByType(type: ComponentType): Component[] {
    return this.findAll((c) => c.type === type)
  }

  entryPoints(): Component[] {
    const targets = new Set(this.graph.links.map((link) => link.target))
    return this.graph.components.filter((c) => {
      const isEntryPointType = c.type === 'UI' || c.type === 'API' || c.type === 'EventHandler' || c.type === 'Custom'
      const hasNoIncomingLinks = !targets.has(c.id)
      return isEntryPointType && hasNoIncomingLinks
    })
  }

  traceFlow(startComponentId: string): { componentIds: string[]; linkIds: string[] } {
    const component = this.componentById(startComponentId)
    if (!component) {
      throw new Error(`Cannot trace flow: component '${startComponentId}' does not exist`)
    }

    const visitedComponents = new Set<string>()
    const visitedLinks = new Set<string>()
    const queue: string[] = [startComponentId]

    while (queue.length > 0) {
      const currentId = queue.shift()
      if (currentId === undefined || visitedComponents.has(currentId)) {
        continue
      }
      visitedComponents.add(currentId)

      for (const link of this.graph.links) {
        if (link.source === currentId && !visitedComponents.has(link.target)) {
          queue.push(link.target)
          visitedLinks.add(link.id ?? `${link.source}->${link.target}`)
        }
        if (link.target === currentId && !visitedComponents.has(link.source)) {
          queue.push(link.source)
          visitedLinks.add(link.id ?? `${link.source}->${link.target}`)
        }
      }
    }

    return { componentIds: Array.from(visitedComponents), linkIds: Array.from(visitedLinks) }
  }

  private buildConnectedComponentIds(): Set<string> {
    const connected = new Set<string>()
    this.graph.links.forEach((link) => {
      connected.add(link.source)
      connected.add(link.target)
    })
    return connected
  }

  diff(other: RiviereGraph): GraphDiff {
    const thisIds = new Set(this.graph.components.map((c) => c.id))
    const otherIds = new Set(other.components.map((c) => c.id))
    const otherComponentsById = new Map(other.components.map((c) => [c.id, c]))

    const added = other.components.filter((c) => !thisIds.has(c.id))
    const removed = this.graph.components.filter((c) => !otherIds.has(c.id))

    const modified: ComponentModification[] = []
    for (const thisComponent of this.graph.components) {
      const otherComponent = otherComponentsById.get(thisComponent.id)
      if (!otherComponent) {
        continue
      }
      const changedFields = this.findChangedFields(thisComponent, otherComponent)
      if (changedFields.length > 0) {
        modified.push({
          id: thisComponent.id,
          before: thisComponent,
          after: otherComponent,
          changedFields,
        })
      }
    }

    const linkKey = (link: Link): string => link.id ?? `${link.source}->${link.target}`
    const thisLinkKeys = new Set(this.graph.links.map(linkKey))
    const otherLinkKeys = new Set(other.links.map(linkKey))

    const linksAdded = other.links.filter((link) => !thisLinkKeys.has(linkKey(link)))
    const linksRemoved = this.graph.links.filter((link) => !otherLinkKeys.has(linkKey(link)))

    return {
      components: {
        added,
        removed,
        modified,
      },
      links: {
        added: linksAdded,
        removed: linksRemoved,
      },
      stats: {
        componentsAdded: added.length,
        componentsRemoved: removed.length,
        componentsModified: modified.length,
        linksAdded: linksAdded.length,
        linksRemoved: linksRemoved.length,
      },
    }
  }

  private findChangedFields(before: Component, after: Component): string[] {
    const beforeEntries = new Map(Object.entries(before))
    const afterEntries = new Map(Object.entries(after))
    const changedFields: string[] = []
    const allKeys = new Set([...beforeEntries.keys(), ...afterEntries.keys()])
    for (const key of allKeys) {
      if (key === 'id') {
        continue
      }
      if (JSON.stringify(beforeEntries.get(key)) !== JSON.stringify(afterEntries.get(key))) {
        changedFields.push(key)
      }
    }
    return changedFields
  }
}
