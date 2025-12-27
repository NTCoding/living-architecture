import type {
  APIComponent,
  Component,
  CustomComponent,
  CustomTypeDefinition,
  DomainOpComponent,
  EventComponent,
  EventHandlerComponent,
  ExternalLink,
  GraphMetadata,
  Link,
  RiviereGraph,
  SourceInfo,
  UIComponent,
  UseCaseComponent,
} from '@living-architecture/riviere-schema'
import { similarityScore } from './string-similarity'
import type {
  APIInput,
  BuilderOptions,
  CustomInput,
  CustomTypeInput,
  DomainInput,
  DomainOpInput,
  EventHandlerInput,
  EventInput,
  ExternalLinkInput,
  LinkInput,
  NearMatchMismatch,
  NearMatchOptions,
  NearMatchQuery,
  NearMatchResult,
  UIInput,
  UseCaseInput,
} from './types'

export type {
  APIInput,
  BuilderOptions,
  CustomInput,
  CustomTypeInput,
  DomainInput,
  DomainOpInput,
  EventHandlerInput,
  EventInput,
  ExternalLinkInput,
  LinkInput,
  NearMatchMismatch,
  NearMatchOptions,
  NearMatchQuery,
  NearMatchResult,
  UIInput,
  UseCaseInput,
}

interface BuilderMetadata extends Omit<GraphMetadata, 'sources' | 'customTypes'> {
  sources: SourceInfo[]
  customTypes: Record<string, CustomTypeDefinition>
}

interface BuilderGraph extends Omit<RiviereGraph, 'metadata' | 'externalLinks'> {
  metadata: BuilderMetadata
  externalLinks: ExternalLink[]
}

export class RiviereBuilder {
  graph: BuilderGraph

  private constructor(graph: BuilderGraph) {
    this.graph = graph
  }

  static new(options: BuilderOptions): RiviereBuilder {
    if (options.sources.length === 0) {
      throw new Error('At least one source required')
    }

    if (Object.keys(options.domains).length === 0) {
      throw new Error('At least one domain required')
    }

    const graph: BuilderGraph = {
      version: '1.0',
      metadata: {
        ...(options.name !== undefined && { name: options.name }),
        ...(options.description !== undefined && { description: options.description }),
        sources: options.sources,
        domains: options.domains,
        customTypes: {},
      },
      components: [],
      links: [],
      externalLinks: [],
    }

    return new RiviereBuilder(graph)
  }

  addSource(source: SourceInfo): void {
    this.graph.metadata.sources.push(source)
  }

  addDomain(input: DomainInput): void {
    if (this.graph.metadata.domains[input.name]) {
      throw new Error(`Domain '${input.name}' already exists`)
    }

    this.graph.metadata.domains[input.name] = {
      description: input.description,
      systemType: input.systemType,
    }
  }

  addUI(input: UIInput): UIComponent {
    this.validateDomainExists(input.domain)
    const id = this.generateComponentId(input.domain, input.module, 'ui', input.name)

    const component: UIComponent = {
      id,
      type: 'UI',
      name: input.name,
      domain: input.domain,
      module: input.module,
      route: input.route,
      sourceLocation: input.sourceLocation,
      ...(input.description !== undefined && { description: input.description }),
      ...(input.metadata !== undefined && { metadata: input.metadata }),
    }
    return this.registerComponent(component)
  }

  addApi(input: APIInput): APIComponent {
    this.validateDomainExists(input.domain)
    const id = this.generateComponentId(input.domain, input.module, 'api', input.name)

    const component: APIComponent = {
      id,
      type: 'API',
      name: input.name,
      domain: input.domain,
      module: input.module,
      apiType: input.apiType,
      sourceLocation: input.sourceLocation,
      ...(input.httpMethod !== undefined && { httpMethod: input.httpMethod }),
      ...(input.path !== undefined && { path: input.path }),
      ...(input.operationName !== undefined && { operationName: input.operationName }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.metadata !== undefined && { metadata: input.metadata }),
    }
    return this.registerComponent(component)
  }

  addUseCase(input: UseCaseInput): UseCaseComponent {
    this.validateDomainExists(input.domain)
    const id = this.generateComponentId(input.domain, input.module, 'usecase', input.name)

    const component: UseCaseComponent = {
      id,
      type: 'UseCase',
      name: input.name,
      domain: input.domain,
      module: input.module,
      sourceLocation: input.sourceLocation,
      ...(input.description !== undefined && { description: input.description }),
      ...(input.metadata !== undefined && { metadata: input.metadata }),
    }
    return this.registerComponent(component)
  }

  addDomainOp(input: DomainOpInput): DomainOpComponent {
    this.validateDomainExists(input.domain)
    const id = this.generateComponentId(input.domain, input.module, 'domainop', input.name)

    const component: DomainOpComponent = {
      id,
      type: 'DomainOp',
      name: input.name,
      domain: input.domain,
      module: input.module,
      operationName: input.operationName,
      sourceLocation: input.sourceLocation,
      ...(input.entity !== undefined && { entity: input.entity }),
      ...(input.signature !== undefined && { signature: input.signature }),
      ...(input.behavior !== undefined && { behavior: input.behavior }),
      ...(input.stateChanges !== undefined && { stateChanges: input.stateChanges }),
      ...(input.businessRules !== undefined && { businessRules: input.businessRules }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.metadata !== undefined && { metadata: input.metadata }),
    }
    return this.registerComponent(component)
  }

  addEvent(input: EventInput): EventComponent {
    this.validateDomainExists(input.domain)
    const id = this.generateComponentId(input.domain, input.module, 'event', input.name)

    const component: EventComponent = {
      id,
      type: 'Event',
      name: input.name,
      domain: input.domain,
      module: input.module,
      eventName: input.eventName,
      sourceLocation: input.sourceLocation,
      ...(input.eventSchema !== undefined && { eventSchema: input.eventSchema }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.metadata !== undefined && { metadata: input.metadata }),
    }
    return this.registerComponent(component)
  }

  addEventHandler(input: EventHandlerInput): EventHandlerComponent {
    this.validateDomainExists(input.domain)
    const id = this.generateComponentId(input.domain, input.module, 'eventhandler', input.name)

    const component: EventHandlerComponent = {
      id,
      type: 'EventHandler',
      name: input.name,
      domain: input.domain,
      module: input.module,
      subscribedEvents: input.subscribedEvents,
      sourceLocation: input.sourceLocation,
      ...(input.description !== undefined && { description: input.description }),
      ...(input.metadata !== undefined && { metadata: input.metadata }),
    }
    return this.registerComponent(component)
  }

  defineCustomType(input: CustomTypeInput): void {
    const customTypes = this.graph.metadata.customTypes

    if (customTypes[input.name]) {
      throw new Error(`Custom type '${input.name}' already defined`)
    }

    customTypes[input.name] = {
      ...(input.requiredProperties !== undefined && { requiredProperties: input.requiredProperties }),
      ...(input.optionalProperties !== undefined && { optionalProperties: input.optionalProperties }),
      ...(input.description !== undefined && { description: input.description }),
    }
  }

  addCustom(input: CustomInput): CustomComponent {
    this.validateDomainExists(input.domain)
    this.validateCustomType(input.customTypeName)
    this.validateRequiredProperties(input.customTypeName, input.metadata)
    const id = this.generateComponentId(input.domain, input.module, 'custom', input.name)

    const component: CustomComponent = {
      id,
      type: 'Custom',
      customTypeName: input.customTypeName,
      name: input.name,
      domain: input.domain,
      module: input.module,
      sourceLocation: input.sourceLocation,
      ...(input.description !== undefined && { description: input.description }),
      ...(input.metadata !== undefined && { metadata: input.metadata }),
    }
    return this.registerComponent(component)
  }

  private validateDomainExists(domain: string): void {
    if (!this.graph.metadata.domains[domain]) {
      throw new Error(`Domain '${domain}' does not exist`)
    }
  }

  private validateCustomType(customTypeName: string): void {
    const customTypes = this.graph.metadata.customTypes
    if (!customTypes[customTypeName]) {
      const definedTypes = Object.keys(customTypes)
      if (definedTypes.length === 0) {
        throw new Error(`Custom type '${customTypeName}' not defined. No custom types have been defined.`)
      }
      throw new Error(`Custom type '${customTypeName}' not defined. Defined types: ${definedTypes.join(', ')}`)
    }
  }

  private validateRequiredProperties(
    customTypeName: string,
    metadata: Record<string, unknown> | undefined
  ): void {
    const typeDefinition = this.graph.metadata.customTypes[customTypeName]
    if (!typeDefinition?.requiredProperties) {
      return
    }

    const requiredKeys = Object.keys(typeDefinition.requiredProperties)
    const providedKeys = metadata ? Object.keys(metadata) : []
    const missingKeys = requiredKeys.filter((key) => !providedKeys.includes(key))

    if (missingKeys.length > 0) {
      throw new Error(
        `Missing required properties for '${customTypeName}': ${missingKeys.join(', ')}`
      )
    }
  }

  private generateComponentId(domain: string, module: string, type: string, name: string): string {
    const nameSegment = name.toLowerCase().replace(/\s+/g, '-')
    return `${domain}:${module}:${type}:${nameSegment}`
  }

  private registerComponent<T extends Component>(component: T): T {
    if (this.graph.components.some((c) => c.id === component.id)) {
      throw new Error(`Component with ID '${component.id}' already exists`)
    }
    this.graph.components.push(component)
    return component
  }

  nearMatches(query: NearMatchQuery, options?: NearMatchOptions): NearMatchResult[] {
    if (query.name === '') {
      return []
    }

    const threshold = options?.threshold ?? 0.6
    const limit = options?.limit ?? 10

    const results = this.graph.components
      .map((component): NearMatchResult => {
        const score = similarityScore(query.name, component.name)
        const mismatch = this.detectMismatch(query, component)
        return { component, score, mismatch }
      })
      .filter((result) => result.score >= threshold || result.mismatch !== undefined)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)

    return results
  }

  private detectMismatch(query: NearMatchQuery, component: Component): NearMatchMismatch | undefined {
    const nameMatches = query.name.toLowerCase() === component.name.toLowerCase()

    if (!nameMatches) {
      return undefined
    }

    if (query.type !== undefined && query.type !== component.type) {
      return { field: 'type', expected: query.type, actual: component.type }
    }

    if (query.domain !== undefined && query.domain !== component.domain) {
      return { field: 'domain', expected: query.domain, actual: component.domain }
    }

    return undefined
  }

  link(input: LinkInput): Link {
    const sourceExists = this.graph.components.some((c) => c.id === input.from)
    if (!sourceExists) {
      throw this.sourceNotFoundError(input.from)
    }

    const link: Link = {
      source: input.from,
      target: input.to,
      ...(input.type !== undefined && { type: input.type }),
    }
    this.graph.links.push(link)
    return link
  }

  linkExternal(input: ExternalLinkInput): ExternalLink {
    const sourceExists = this.graph.components.some((c) => c.id === input.from)
    if (!sourceExists) {
      throw this.sourceNotFoundError(input.from)
    }

    const externalLink: ExternalLink = {
      source: input.from,
      target: input.target,
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.sourceLocation !== undefined && { sourceLocation: input.sourceLocation }),
      ...(input.metadata !== undefined && { metadata: input.metadata }),
    }
    this.graph.externalLinks.push(externalLink)
    return externalLink
  }

  private sourceNotFoundError(id: string): Error {
    const parts = id.split(':')
    const namePart = parts[parts.length - 1]!
    const suggestions = this.nearMatches({ name: namePart }, { limit: 3 })
    const baseMessage = `Source component '${id}' not found`
    if (suggestions.length === 0) {
      return new Error(baseMessage)
    }
    const suggestionIds = suggestions.map((s) => s.component.id).join(', ')
    return new Error(`${baseMessage}. Did you mean: ${suggestionIds}?`)
  }
}
