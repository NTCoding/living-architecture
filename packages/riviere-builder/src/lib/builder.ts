import type {
  APIComponent,
  ApiType,
  Component,
  CustomComponent,
  CustomPropertyDefinition,
  DomainMetadata,
  DomainOpComponent,
  EventComponent,
  EventHandlerComponent,
  GraphMetadata,
  HttpMethod,
  OperationBehavior,
  OperationSignature,
  RiviereGraph,
  SourceInfo,
  SourceLocation,
  StateTransition,
  SystemType,
  UIComponent,
  UseCaseComponent,
} from '@living-architecture/riviere-schema'

export interface BuilderOptions {
  name?: string
  description?: string
  sources: SourceInfo[]
  domains: Record<string, DomainMetadata>
}

export interface DomainInput {
  name: string
  description: string
  systemType: SystemType
}

export interface UIInput {
  name: string
  domain: string
  module: string
  route: string
  description?: string
  sourceLocation: SourceLocation
  metadata?: Record<string, unknown>
}

export interface APIInput {
  name: string
  domain: string
  module: string
  apiType: ApiType
  httpMethod?: HttpMethod
  path?: string
  operationName?: string
  description?: string
  sourceLocation: SourceLocation
  metadata?: Record<string, unknown>
}

export interface UseCaseInput {
  name: string
  domain: string
  module: string
  description?: string
  sourceLocation: SourceLocation
  metadata?: Record<string, unknown>
}

export interface DomainOpInput {
  name: string
  domain: string
  module: string
  operationName: string
  entity?: string
  signature?: OperationSignature
  behavior?: OperationBehavior
  stateChanges?: StateTransition[]
  businessRules?: string[]
  description?: string
  sourceLocation: SourceLocation
  metadata?: Record<string, unknown>
}

export interface EventInput {
  name: string
  domain: string
  module: string
  eventName: string
  eventSchema?: string
  description?: string
  sourceLocation: SourceLocation
  metadata?: Record<string, unknown>
}

export interface EventHandlerInput {
  name: string
  domain: string
  module: string
  subscribedEvents: string[]
  description?: string
  sourceLocation: SourceLocation
  metadata?: Record<string, unknown>
}

export interface CustomTypeInput {
  name: string
  description?: string
  requiredProperties?: Record<string, CustomPropertyDefinition>
  optionalProperties?: Record<string, CustomPropertyDefinition>
}

export interface CustomInput {
  customTypeName: string
  name: string
  domain: string
  module: string
  description?: string
  sourceLocation: SourceLocation
  metadata?: Record<string, unknown>
}

interface BuilderMetadata extends Omit<GraphMetadata, 'sources'> {
  sources: SourceInfo[]
}

interface BuilderGraph extends Omit<RiviereGraph, 'metadata'> {
  metadata: BuilderMetadata
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
      },
      components: [],
      links: [],
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
    if (!this.graph.metadata.customTypes) {
      this.graph.metadata.customTypes = {}
    }

    if (this.graph.metadata.customTypes[input.name]) {
      throw new Error(`Custom type '${input.name}' already defined`)
    }

    this.graph.metadata.customTypes[input.name] = {
      ...(input.requiredProperties !== undefined && { requiredProperties: input.requiredProperties }),
      ...(input.optionalProperties !== undefined && { optionalProperties: input.optionalProperties }),
      ...(input.description !== undefined && { description: input.description }),
    }
  }

  addCustom(input: CustomInput): CustomComponent {
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

  private validateCustomType(customTypeName: string): void {
    const customTypes = this.graph.metadata.customTypes
    if (!customTypes || !customTypes[customTypeName]) {
      const definedTypes = customTypes ? Object.keys(customTypes).join(', ') : ''
      throw new Error(`Custom type '${customTypeName}' not defined. Defined types: ${definedTypes}`)
    }
  }

  private validateRequiredProperties(
    customTypeName: string,
    metadata: Record<string, unknown> | undefined
  ): void {
    const typeDefinition = this.graph.metadata.customTypes?.[customTypeName]
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
    if (!this.graph.metadata.domains[domain]) {
      throw new Error(`Domain '${domain}' does not exist`)
    }
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
}
