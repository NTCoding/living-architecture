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

  private buildConnectedComponentIds(): Set<string> {
    const connected = new Set<string>()
    this.graph.links.forEach((link) => {
      connected.add(link.source)
      connected.add(link.target)
    })
    return connected
  }
}
