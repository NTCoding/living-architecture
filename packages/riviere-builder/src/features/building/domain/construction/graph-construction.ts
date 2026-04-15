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
  UpsertOptions,
  UIInput,
  UseCaseInput,
} from './construction-types'
import {
  ComponentTypeMismatchError,
  CustomTypeAlreadyDefinedError,
  DuplicateComponentError,
  DuplicateDomainError,
  SourceConflictError,
} from './construction-errors'
import {
  generateComponentId,
  validateCustomType,
  validateDomainExists,
  validateRequiredProperties,
} from './builder-internals'
import { mergeComponentForUpsert } from '../enrichment/upsert-merge'
import type { BuilderWarning } from '../inspection/inspection-types'

/** @riviere-role domain-service */
export class GraphConstruction {
  private readonly graph: BuilderGraph
  private readonly operationWarnings: BuilderWarning[]

  constructor(graph: BuilderGraph, operationWarnings: BuilderWarning[]) {
    this.graph = graph
    this.operationWarnings = operationWarnings
  }

  addSource(source: SourceInfo): void {
    const existing = this.graph.metadata.sources.find(
      (item) => item.repository === source.repository,
    )
    if (existing) {
      if (areSourcesEqual(existing, source)) {
        return
      }

      throw new SourceConflictError(source.repository)
    }

    this.graph.metadata.sources.push(source)
  }

  addDomain(input: DomainInput): void {
    const existing = this.graph.metadata.domains[input.name]
    if (existing) {
      if (existing.description === input.description && existing.systemType === input.systemType) {
        return
      }

      throw new DuplicateDomainError(input.name)
    }

    this.graph.metadata.domains[input.name] = {
      description: input.description,
      systemType: input.systemType,
    }
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

    customTypes[input.name] = {
      ...(input.requiredProperties !== undefined && {requiredProperties: input.requiredProperties,}),
      ...(input.optionalProperties !== undefined && {optionalProperties: input.optionalProperties,}),
      ...(input.description !== undefined && { description: input.description }),
    }
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
      ...(input.stateChanges !== undefined && { stateChanges: input.stateChanges }),
      ...(input.businessRules !== undefined && { businessRules: input.businessRules }),
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
      subscribedEvents: input.subscribedEvents,
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
    if (this.graph.components.some((c) => c.id === component.id)) {
      throw new DuplicateComponentError(component.id)
    }
    this.graph.components.push(component)
    return component
  }

  private upsertTypedComponent<T extends Component>(
    incoming: T,
    options?: UpsertOptions,
  ): {
    component: T
    created: boolean
  } {
    const existingIndex = this.graph.components.findIndex(
      (component) => component.id === incoming.id,
    )
    if (existingIndex === -1) {
      this.graph.components.push(incoming)
      return {
        component: incoming,
        created: true,
      }
    }

    const existing = this.graph.components[existingIndex]

    if (!isSameTypeComponent(existing, incoming)) {
      throw new ComponentTypeMismatchError(incoming.id, existing?.type ?? 'unknown', incoming.type)
    }

    const merged = mergeComponentForUpsert(existing, incoming, options, this.operationWarnings)

    this.graph.components[existingIndex] = merged

    return {
      component: merged,
      created: false,
    }
  }
}

function areSourcesEqual(existing: SourceInfo, incoming: SourceInfo): boolean {
  return (
    existing.repository === incoming.repository &&
    existing.commit === incoming.commit &&
    existing.extractedAt === incoming.extractedAt
  )
}

function isSameTypeComponent<T extends Component>(
  existing: Component | undefined,
  incoming: T,
): existing is T {
  return existing?.type === incoming.type
}
