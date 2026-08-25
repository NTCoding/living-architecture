import type {
  APIComponent,
  Component,
  CustomPropertyDefinition,
  CustomComponent,
  DomainOpComponent,
  EventComponent,
  EventHandlerComponent,
  SourceInfo,
  SystemType,
  UIComponent,
  UseCaseComponent,
} from '@living-architecture/riviere-schema-published-language/schema'
import type { BuilderGraph } from '../builder-graph'
import {
  CustomTypeAlreadyDefinedError,
  DuplicateDomainError,
  SourceConflictError,
  RelationshipTypeAlreadyDefinedError,
} from './construction-errors'
import {
  generateComponentId,
  validateCustomType,
  validateDomainExists,
  validateRequiredProperties,
} from './builder-internals'
import { registerComponent, upsertComponent } from './component-registration'

type AddScalarOverwriteWarning = (
  warning: Readonly<{
    code: 'SCALAR_OVERWRITE'
    message: string
    componentId: string
    field: string
    oldValue: string | number | boolean
    newValue: string | number | boolean
  }>,
) => void

type DomainInput = Readonly<{
  name: string
  description: string
  systemType: SystemType
}>

type UpsertOptions = Readonly<{ noOverwrite?: boolean }>

type UIInput = Readonly<
  Pick<UIComponent, 'name' | 'domain' | 'module' | 'route' | 'description' | 'sourceLocation'> & {
    metadata?: Readonly<Record<string, unknown>>
  }
>

type APIInput = Readonly<
  Pick<
    APIComponent,
    | 'name'
    | 'domain'
    | 'module'
    | 'apiType'
    | 'httpMethod'
    | 'path'
    | 'operationName'
    | 'description'
    | 'sourceLocation'
  > & { metadata?: Readonly<Record<string, unknown>> }
>

type UseCaseInput = Readonly<
  Pick<UseCaseComponent, 'name' | 'domain' | 'module' | 'description' | 'sourceLocation'> & {
    metadata?: Readonly<Record<string, unknown>>
  }
>

type DomainOpInput = Readonly<
  Pick<
    DomainOpComponent,
    | 'name'
    | 'domain'
    | 'module'
    | 'operationName'
    | 'entity'
    | 'signature'
    | 'behavior'
    | 'stateChanges'
    | 'businessRules'
    | 'description'
    | 'sourceLocation'
  > & { metadata?: Readonly<Record<string, unknown>> }
>

type EventInput = Readonly<
  Pick<
    EventComponent,
    'name' | 'domain' | 'module' | 'eventName' | 'eventSchema' | 'description' | 'sourceLocation'
  > & { metadata?: Readonly<Record<string, unknown>> }
>

type EventHandlerInput = Readonly<
  Pick<
    EventHandlerComponent,
    'name' | 'domain' | 'module' | 'subscribedEvents' | 'description' | 'sourceLocation'
  > & { metadata?: Readonly<Record<string, unknown>> }
>

type CustomTypeInput = Readonly<{
  name: string
  description?: string
  requiredProperties?: Readonly<Record<string, CustomPropertyDefinition>>
  optionalProperties?: Readonly<Record<string, CustomPropertyDefinition>>
}>

type RelationshipTypeInput = Readonly<{
  name: string
  description: string
}>

type CustomInput = Readonly<
  Pick<
    CustomComponent,
    'customTypeName' | 'name' | 'domain' | 'module' | 'description' | 'sourceLocation'
  > & { metadata?: Readonly<Record<string, unknown>> }
>

/**
 * @riviere-role domain-service
 * @riviere-role-justification TODO: Added before justification rule introduced.
 */
export class GraphConstruction {
  constructor(
    private graph: BuilderGraph,
    private readonly addWarning: AddScalarOverwriteWarning,
    private readonly updateGraph: (graph: BuilderGraph) => void,
  ) {}

  addSource(source: SourceInfo): void {
    const existing = this.graph.metadata.sources.find(
      (item) => item.repository === source.repository,
    )
    if (existing) {
      if (
        existing.repository === source.repository &&
        existing.commit === source.commit &&
        existing.extractedAt === source.extractedAt
      ) {
        return
      }

      throw new SourceConflictError(source.repository)
    }

    this.replaceGraph(this.graph.withSource(source))
  }

  addDomain(input: DomainInput): void {
    const existing = this.graph.metadata.domains[input.name]
    if (existing) {
      if (existing.description === input.description && existing.systemType === input.systemType) {
        return
      }

      throw new DuplicateDomainError(input.name)
    }

    this.replaceGraph(
      this.graph.withDomain(input.name, {
        description: input.description,
        systemType: input.systemType,
      }),
    )
  }

  addUI(input: UIInput): UIComponent {
    return this.registerComponent(this.buildUIComponent(input))
  }

  upsertUI(
    input: UIInput,
    options?: UpsertOptions,
  ): {
    component: UIComponent
    created: boolean
  } {
    return this.upsertTypedComponent(this.buildUIComponent(input), options)
  }

  addApi(input: APIInput): APIComponent {
    return this.registerComponent(this.buildAPIComponent(input))
  }

  upsertApi(
    input: APIInput,
    options?: UpsertOptions,
  ): {
    component: APIComponent
    created: boolean
  } {
    return this.upsertTypedComponent(this.buildAPIComponent(input), options)
  }

  addUseCase(input: UseCaseInput): UseCaseComponent {
    return this.registerComponent(this.buildUseCaseComponent(input))
  }

  upsertUseCase(
    input: UseCaseInput,
    options?: UpsertOptions,
  ): {
    component: UseCaseComponent
    created: boolean
  } {
    return this.upsertTypedComponent(this.buildUseCaseComponent(input), options)
  }

  addDomainOp(input: DomainOpInput): DomainOpComponent {
    return this.registerComponent(this.buildDomainOpComponent(input))
  }

  upsertDomainOp(
    input: DomainOpInput,
    options?: UpsertOptions,
  ): {
    component: DomainOpComponent
    created: boolean
  } {
    return this.upsertTypedComponent(this.buildDomainOpComponent(input), options)
  }

  addEvent(input: EventInput): EventComponent {
    return this.registerComponent(this.buildEventComponent(input))
  }

  upsertEvent(
    input: EventInput,
    options?: UpsertOptions,
  ): {
    component: EventComponent
    created: boolean
  } {
    return this.upsertTypedComponent(this.buildEventComponent(input), options)
  }

  addEventHandler(input: EventHandlerInput): EventHandlerComponent {
    return this.registerComponent(this.buildEventHandlerComponent(input))
  }

  upsertEventHandler(
    input: EventHandlerInput,
    options?: UpsertOptions,
  ): {
    component: EventHandlerComponent
    created: boolean
  } {
    return this.upsertTypedComponent(this.buildEventHandlerComponent(input), options)
  }

  defineCustomType(input: CustomTypeInput): void {
    const customTypes = this.graph.metadata.customTypes

    if (customTypes[input.name]) {
      throw new CustomTypeAlreadyDefinedError(input.name)
    }

    this.replaceGraph(
      this.graph.withCustomType(input.name, {
        ...(input.requiredProperties !== undefined && {
          requiredProperties: input.requiredProperties,
        }),
        ...(input.optionalProperties !== undefined && {
          optionalProperties: input.optionalProperties,
        }),
        ...(input.description !== undefined && { description: input.description }),
      }),
    )
  }

  defineRelationshipType(input: RelationshipTypeInput): void {
    const relationshipTypes = this.graph.metadata.relationshipTypes
    if (Object.hasOwn(relationshipTypes, input.name)) {
      throw new RelationshipTypeAlreadyDefinedError(input.name)
    }

    this.replaceGraph(
      this.graph.withRelationshipType(input.name, { description: input.description }),
    )
  }

  addCustom(input: CustomInput): CustomComponent {
    return this.registerComponent(this.buildCustomComponent(input))
  }

  upsertCustom(
    input: CustomInput,
    options?: UpsertOptions,
  ): {
    component: CustomComponent
    created: boolean
  } {
    return this.upsertTypedComponent(this.buildCustomComponent(input), options)
  }

  private buildUIComponent(input: UIInput): UIComponent {
    validateDomainExists(this.graph.metadata.domains, input.domain)
    const id = generateComponentId(input.domain, input.module, 'ui', input.name)

    return {
      id,
      type: 'UI',
      name: input.name,
      domain: input.domain,
      module: input.module,
      route: input.route,
      sourceLocation: input.sourceLocation,
      ...(input.description !== undefined && { description: input.description }),
    }
  }

  private buildAPIComponent(input: APIInput): APIComponent {
    validateDomainExists(this.graph.metadata.domains, input.domain)
    const id = generateComponentId(input.domain, input.module, 'api', input.name)

    return {
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
    }
  }

  private buildUseCaseComponent(input: UseCaseInput): UseCaseComponent {
    validateDomainExists(this.graph.metadata.domains, input.domain)
    const id = generateComponentId(input.domain, input.module, 'usecase', input.name)

    return {
      id,
      type: 'UseCase',
      name: input.name,
      domain: input.domain,
      module: input.module,
      sourceLocation: input.sourceLocation,
      ...(input.description !== undefined && { description: input.description }),
    }
  }

  private buildDomainOpComponent(input: DomainOpInput): DomainOpComponent {
    validateDomainExists(this.graph.metadata.domains, input.domain)
    const id = generateComponentId(input.domain, input.module, 'domainop', input.name)

    return {
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
      ...(input.stateChanges !== undefined && { stateChanges: [...input.stateChanges] }),
      ...(input.businessRules !== undefined && { businessRules: [...input.businessRules] }),
      ...(input.description !== undefined && { description: input.description }),
    }
  }

  private buildEventComponent(input: EventInput): EventComponent {
    validateDomainExists(this.graph.metadata.domains, input.domain)
    const id = generateComponentId(input.domain, input.module, 'event', input.name)

    return {
      id,
      type: 'Event',
      name: input.name,
      domain: input.domain,
      module: input.module,
      eventName: input.eventName,
      sourceLocation: input.sourceLocation,
      ...(input.eventSchema !== undefined && { eventSchema: input.eventSchema }),
      ...(input.description !== undefined && { description: input.description }),
    }
  }

  private buildEventHandlerComponent(input: EventHandlerInput): EventHandlerComponent {
    validateDomainExists(this.graph.metadata.domains, input.domain)
    const id = generateComponentId(input.domain, input.module, 'eventhandler', input.name)

    return {
      id,
      type: 'EventHandler',
      name: input.name,
      domain: input.domain,
      module: input.module,
      subscribedEvents: [...input.subscribedEvents],
      sourceLocation: input.sourceLocation,
      ...(input.description !== undefined && { description: input.description }),
    }
  }

  private buildCustomComponent(input: CustomInput): CustomComponent {
    validateDomainExists(this.graph.metadata.domains, input.domain)
    validateCustomType(this.graph.metadata.customTypes, input.customTypeName)
    validateRequiredProperties(
      this.graph.metadata.customTypes,
      input.customTypeName,
      input.metadata,
    )
    const id = generateComponentId(input.domain, input.module, 'custom', input.name)

    const component: CustomComponent = {
      id,
      type: 'Custom',
      customTypeName: input.customTypeName,
      name: input.name,
      domain: input.domain,
      module: input.module,
      sourceLocation: input.sourceLocation,
      ...(input.description !== undefined && { description: input.description }),
      ...input.metadata,
    }

    return component
  }

  private registerComponent<T extends Component>(component: T): T {
    const result = registerComponent(this.graph, component)
    this.replaceGraph(result.graph)
    return result.component
  }

  private upsertTypedComponent<T extends Component>(
    incoming: T,
    options?: UpsertOptions,
  ): {
    component: T
    created: boolean
  } {
    const result = upsertComponent(this.graph, incoming, options, this.addWarning)
    this.replaceGraph(result.graph)
    return {
      component: result.component,
      created: result.created,
    }
  }

  private replaceGraph(graph: BuilderGraph): void {
    this.graph = graph
    this.updateGraph(graph)
  }
}
