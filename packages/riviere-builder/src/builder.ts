import { promises as fs } from 'node:fs'
import { dirname } from 'node:path'
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
import { RiviereQuery, type ValidationResult } from '@living-architecture/riviere-query'
import { calculateStats, findOrphans, findWarnings, toRiviereGraph, validateGraph } from './inspection'
import { assertCustomTypeExists, assertDomainExists, assertRequiredPropertiesProvided } from './builder-assertions'
import { ComponentId } from './component-id'
import { createSourceNotFoundError, findNearMatches } from './component-suggestion'
import type {
  APIInput,
  BuilderOptions,
  BuilderStats,
  BuilderWarning,
  CustomInput,
  CustomTypeInput,
  DomainInput,
  DomainOpInput,
  EnrichmentInput,
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
  BuilderStats,
  BuilderWarning,
  CustomInput,
  CustomTypeInput,
  DomainInput,
  DomainOpInput,
  EnrichmentInput,
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

  enrichComponent(id: string, enrichment: EnrichmentInput): void {
    const component = this.graph.components.find((c) => c.id === id)
    if (!component) {
      throw this.componentNotFoundError(id)
    }
    if (component.type !== 'DomainOp') {
      throw new Error(`Only DomainOp components can be enriched. '${id}' is type '${component.type}'`)
    }
    if (enrichment.entity !== undefined) {
      component.entity = enrichment.entity
    }
    if (enrichment.stateChanges !== undefined) {
      component.stateChanges = [...(component.stateChanges ?? []), ...enrichment.stateChanges]
    }
    if (enrichment.businessRules !== undefined) {
      component.businessRules = [...(component.businessRules ?? []), ...enrichment.businessRules]
    }
  }

  private componentNotFoundError(id: string): Error {
    return createSourceNotFoundError(this.graph.components, ComponentId.parse(id))
  }

  private validateDomainExists(domain: string): void {
    assertDomainExists(this.graph.metadata.domains, domain)
  }

  private validateCustomType(customTypeName: string): void {
    assertCustomTypeExists(this.graph.metadata.customTypes, customTypeName)
  }

  private validateRequiredProperties(
    customTypeName: string,
    metadata: Record<string, unknown> | undefined
  ): void {
    assertRequiredPropertiesProvided(this.graph.metadata.customTypes, customTypeName, metadata)
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
    return findNearMatches(this.graph.components, query, options)
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

  warnings(): BuilderWarning[] {
    return findWarnings(this.graph)
  }

  stats(): BuilderStats {
    return calculateStats(this.graph)
  }

  validate(): ValidationResult {
    return validateGraph(this.graph)
  }

  orphans(): string[] {
    return findOrphans(this.graph)
  }

  query(): RiviereQuery {
    return new RiviereQuery(toRiviereGraph(this.graph))
  }

  build(): RiviereGraph {
    const result = this.validate()
    if (!result.valid) {
      const messages = result.errors.map((e) => e.message).join('; ')
      throw new Error(`Validation failed: ${messages}`)
    }
    return toRiviereGraph(this.graph)
  }

  async save(path: string): Promise<void> {
    const graph = this.build()

    const dir = dirname(path)
    try {
      await fs.access(dir)
    } catch {
      throw new Error(`Directory does not exist: ${dir}`)
    }

    const json = JSON.stringify(graph, null, 2)
    await fs.writeFile(path, json, 'utf-8')
  }

  private sourceNotFoundError(id: string): Error {
    return createSourceNotFoundError(this.graph.components, ComponentId.parse(id))
  }
}
