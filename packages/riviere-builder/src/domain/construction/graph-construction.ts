import type {
  APIComponent,
  Component,
  CustomComponent,
  DomainOpComponent,
  EventComponent,
  EventHandlerComponent,
  SourceInfo,
  UIComponent,
  UseCaseComponent,
} from '@living-architecture/riviere-schema'
import type { BuilderGraph } from '../builder-graph'
import type {
  APIInput,
  CustomInput,
  CustomTypeInput,
  DomainInput,
  DomainOpInput,
  EventHandlerInput,
  EventInput,
  UIInput,
  UseCaseInput,
} from './construction-types'
import {
  CustomTypeAlreadyDefinedError,
  DuplicateComponentError,
  DuplicateDomainError,
} from './construction-errors'
import {
  generateComponentId,
  validateCustomType,
  validateDomainExists,
  validateRequiredProperties,
} from '../../builder-internals'

export class GraphConstruction {
  private readonly graph: BuilderGraph

  constructor(graph: BuilderGraph) {
    this.graph = graph
  }

  addSource(source: SourceInfo): void {
    this.graph.metadata.sources.push(source)
  }

  addDomain(input: DomainInput): void {
    if (this.graph.metadata.domains[input.name]) {
      throw new DuplicateDomainError(input.name)
    }

    this.graph.metadata.domains[input.name] = {
      description: input.description,
      systemType: input.systemType,
    }
  }

  addUI(input: UIInput): UIComponent {
    validateDomainExists(this.graph.metadata.domains, input.domain)
    const id = generateComponentId(input.domain, input.module, 'ui', input.name)

    const component: UIComponent = {
      id,
      type: 'UI',
      name: input.name,
      domain: input.domain,
      module: input.module,
      route: input.route,
      sourceLocation: input.sourceLocation,
      ...(input.description !== undefined && { description: input.description }),
    }
    return this.registerComponent(component)
  }

  addApi(input: APIInput): APIComponent {
    validateDomainExists(this.graph.metadata.domains, input.domain)
    const id = generateComponentId(input.domain, input.module, 'api', input.name)

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
    }
    return this.registerComponent(component)
  }

  addUseCase(input: UseCaseInput): UseCaseComponent {
    validateDomainExists(this.graph.metadata.domains, input.domain)
    const id = generateComponentId(input.domain, input.module, 'usecase', input.name)

    const component: UseCaseComponent = {
      id,
      type: 'UseCase',
      name: input.name,
      domain: input.domain,
      module: input.module,
      sourceLocation: input.sourceLocation,
      ...(input.description !== undefined && { description: input.description }),
    }
    return this.registerComponent(component)
  }

  addDomainOp(input: DomainOpInput): DomainOpComponent {
    validateDomainExists(this.graph.metadata.domains, input.domain)
    const id = generateComponentId(input.domain, input.module, 'domainop', input.name)

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
    }
    return this.registerComponent(component)
  }

  addEvent(input: EventInput): EventComponent {
    validateDomainExists(this.graph.metadata.domains, input.domain)
    const id = generateComponentId(input.domain, input.module, 'event', input.name)

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
    }
    return this.registerComponent(component)
  }

  addEventHandler(input: EventHandlerInput): EventHandlerComponent {
    validateDomainExists(this.graph.metadata.domains, input.domain)
    const id = generateComponentId(input.domain, input.module, 'eventhandler', input.name)

    const component: EventHandlerComponent = {
      id,
      type: 'EventHandler',
      name: input.name,
      domain: input.domain,
      module: input.module,
      subscribedEvents: input.subscribedEvents,
      sourceLocation: input.sourceLocation,
      ...(input.description !== undefined && { description: input.description }),
    }
    return this.registerComponent(component)
  }

  defineCustomType(input: CustomTypeInput): void {
    const customTypes = this.graph.metadata.customTypes

    if (customTypes[input.name]) {
      throw new CustomTypeAlreadyDefinedError(input.name)
    }

    customTypes[input.name] = {
      ...(input.requiredProperties !== undefined && {requiredProperties: input.requiredProperties,}),
      ...(input.optionalProperties !== undefined && {optionalProperties: input.optionalProperties,}),
      ...(input.description !== undefined && { description: input.description }),
    }
  }

  addCustom(input: CustomInput): CustomComponent {
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
    return this.registerComponent(component)
  }

  private registerComponent<T extends Component>(component: T): T {
    if (this.graph.components.some((c) => c.id === component.id)) {
      throw new DuplicateComponentError(component.id)
    }
    this.graph.components.push(component)
    return component
  }
}
