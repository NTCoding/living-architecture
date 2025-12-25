import type { RiviereGraph, Component, Link, CustomComponent, ComponentType, DomainOpComponent } from '@living-architecture/riviere-schema'
import { parseRiviereGraph } from '@living-architecture/riviere-schema'
import { z } from 'zod'

const componentIdSchema = z.string().brand<'ComponentId'>()
const linkIdSchema = z.string().brand<'LinkId'>()

export type ComponentId = z.infer<typeof componentIdSchema>
export type LinkId = z.infer<typeof linkIdSchema>

export function parseComponentId(id: string): ComponentId {
  return componentIdSchema.parse(id)
}

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

export interface Domain {
  name: string
  description: string
  systemType: 'domain' | 'bff' | 'ui' | 'other'
  componentCounts: Record<ComponentType, number> & { total: number }
}

export interface Entity {
  name: string
  domain: string
  operations: DomainOpComponent[]
}

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

  detectOrphans(): ComponentId[] {
    const connectedComponentIds = this.buildConnectedComponentIds()
    return this.graph.components
      .filter((c) => !connectedComponentIds.has(c.id))
      .map((c) => componentIdSchema.parse(c.id))
  }

  find(predicate: (component: Component) => boolean): Component | undefined {
    return this.graph.components.find(predicate)
  }

  findAll(predicate: (component: Component) => boolean): Component[] {
    return this.graph.components.filter(predicate)
  }

  componentById(id: ComponentId): Component | undefined {
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

  domains(): Domain[] {
    return Object.entries(this.graph.metadata.domains).map(([name, metadata]) => {
      const domainComponents = this.componentsInDomain(name)

      const componentCounts: Record<ComponentType, number> & { total: number } = {
        UI: domainComponents.filter((c) => c.type === 'UI').length,
        API: domainComponents.filter((c) => c.type === 'API').length,
        UseCase: domainComponents.filter((c) => c.type === 'UseCase').length,
        DomainOp: domainComponents.filter((c) => c.type === 'DomainOp').length,
        Event: domainComponents.filter((c) => c.type === 'Event').length,
        EventHandler: domainComponents.filter((c) => c.type === 'EventHandler').length,
        Custom: domainComponents.filter((c) => c.type === 'Custom').length,
        total: domainComponents.length,
      }

      return {
        name,
        description: metadata.description,
        systemType: metadata.systemType,
        componentCounts,
      }
    })
  }

  operationsFor(entityName: string): DomainOpComponent[] {
    return this.graph.components.filter(
      (c): c is DomainOpComponent => c.type === 'DomainOp' && c.entity === entityName
    )
  }

  entities(domainName?: string): Entity[] {
    const domainOps = this.graph.components.filter(
      (c): c is DomainOpComponent & { entity: string } => c.type === 'DomainOp' && c.entity !== undefined
    )

    const filtered = domainName ? domainOps.filter((op) => op.domain === domainName) : domainOps

    const entityMap = new Map<string, Entity>()
    for (const op of filtered) {
      const key = `${op.domain}:${op.entity}`
      const existing = entityMap.get(key)
      if (existing) {
        existing.operations.push(op)
      } else {
        entityMap.set(key, { name: op.entity, domain: op.domain, operations: [op] })
      }
    }

    return Array.from(entityMap.values())
  }

  businessRulesFor(entityName: string): string[] {
    const operations = this.operationsFor(entityName)
    const allRules: string[] = []
    for (const op of operations) {
      if (op.businessRules) {
        allRules.push(...op.businessRules)
      }
    }
    return [...new Set(allRules)]
  }

  entryPoints(): Component[] {
    const targets = new Set(this.graph.links.map((link) => link.target))
    return this.graph.components.filter((c) => {
      const isEntryPointType = c.type === 'UI' || c.type === 'API' || c.type === 'EventHandler' || c.type === 'Custom'
      const hasNoIncomingLinks = !targets.has(c.id)
      return isEntryPointType && hasNoIncomingLinks
    })
  }

  traceFlow(startComponentId: ComponentId): { componentIds: ComponentId[]; linkIds: LinkId[] } {
    const component = this.componentById(startComponentId)
    if (!component) {
      throw new Error(`Cannot trace flow: component '${startComponentId}' does not exist`)
    }

    const visitedComponents = new Set<ComponentId>()
    const visitedLinks = new Set<LinkId>()
    const queue: ComponentId[] = [startComponentId]

    while (queue.length > 0) {
      const currentId = queue.shift()
      if (currentId === undefined || visitedComponents.has(currentId)) {
        continue
      }
      visitedComponents.add(currentId)

      for (const link of this.graph.links) {
        const sourceId = componentIdSchema.parse(link.source)
        const targetId = componentIdSchema.parse(link.target)
        if (link.source === currentId && !visitedComponents.has(targetId)) {
          queue.push(targetId)
          visitedLinks.add(this.linkKey(link))
        }
        if (link.target === currentId && !visitedComponents.has(sourceId)) {
          queue.push(sourceId)
          visitedLinks.add(this.linkKey(link))
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

  private linkKey(link: Link): LinkId {
    if (link.id !== undefined) {
      return linkIdSchema.parse(link.id)
    }
    return linkIdSchema.parse(`${link.source}->${link.target}`)
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
          id: componentIdSchema.parse(thisComponent.id),
          before: thisComponent,
          after: otherComponent,
          changedFields,
        })
      }
    }

    const thisLinkKeys = new Set(this.graph.links.map((link) => this.linkKey(link)))
    const otherLinkKeys = new Set(other.links.map((link) => this.linkKey(link)))

    const linksAdded = other.links.filter((link) => !thisLinkKeys.has(this.linkKey(link)))
    const linksRemoved = this.graph.links.filter((link) => !otherLinkKeys.has(this.linkKey(link)))

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
