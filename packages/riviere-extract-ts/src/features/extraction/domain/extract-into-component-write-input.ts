import { ComponentId } from '@living-architecture/riviere-schema'
import type { EnrichedComponent } from './value-extraction/enrich-components'
import {
  toSourceLocation, type ComponentWriteInput 
} from './extraction-write-port'

/** @riviere-role domain-service */
export function toExtractionComponentId(component: EnrichedComponent): string {
  return ComponentId.create({
    domain: component.domain,
    module: component.module,
    type: toComponentIdTypeSegment(component.type),
    name: component.name,
  }).toString()
}

/** @riviere-role domain-service */
export function toComponentWriteInput(
  component: EnrichedComponent,
  repository: string,
): ComponentWriteInput | undefined {
  const sourceLocation = toSourceLocation(
    repository,
    component.location.file,
    component.location.line,
  )

  if (component.type === 'useCase') {
    return {
      type: 'useCase',
      name: component.name,
      domain: component.domain,
      module: component.module,
      sourceLocation,
    }
  }

  if (component.type === 'domainOp') {
    return toDomainOpWriteInput(component, sourceLocation)
  }

  if (component.type === 'api') {
    return toApiWriteInput(component, sourceLocation)
  }

  if (component.type === 'ui') {
    return toUiWriteInput(component, sourceLocation)
  }

  if (component.type === 'event') {
    return toEventWriteInput(component, sourceLocation)
  }

  if (component.type === 'eventHandler') {
    return toEventHandlerWriteInput(component, sourceLocation)
  }

  return {
    type: 'custom',
    customTypeName: component.type,
    name: component.name,
    domain: component.domain,
    module: component.module,
    sourceLocation,
    metadata: component.metadata,
  }
}

function toDomainOpWriteInput(
  component: EnrichedComponent,
  sourceLocation: ReturnType<typeof toSourceLocation>,
): ComponentWriteInput | undefined {
  const operationName = readStringMetadata(component, 'operationName')
  if (operationName === undefined) {
    return undefined
  }

  return {
    type: 'domainOp',
    name: component.name,
    domain: component.domain,
    module: component.module,
    operationName,
    sourceLocation,
  }
}

function toApiWriteInput(
  component: EnrichedComponent,
  sourceLocation: ReturnType<typeof toSourceLocation>,
): ComponentWriteInput | undefined {
  const apiType = readApiType(component)
  if (apiType === undefined) {
    return undefined
  }

  const path = readStringMetadata(component, 'path')
  const operationName = readStringMetadata(component, 'operationName')
  const httpMethod = readHttpMethod(component)

  return {
    type: 'api',
    name: component.name,
    domain: component.domain,
    module: component.module,
    apiType,
    sourceLocation,
    ...(path !== undefined && { path }),
    ...(operationName !== undefined && { operationName }),
    ...(httpMethod !== undefined && { httpMethod }),
  }
}

function toUiWriteInput(
  component: EnrichedComponent,
  sourceLocation: ReturnType<typeof toSourceLocation>,
): ComponentWriteInput | undefined {
  const route = readStringMetadata(component, 'route')
  if (route === undefined) {
    return undefined
  }

  return {
    type: 'ui',
    name: component.name,
    domain: component.domain,
    module: component.module,
    route,
    sourceLocation,
  }
}

function toEventWriteInput(
  component: EnrichedComponent,
  sourceLocation: ReturnType<typeof toSourceLocation>,
): ComponentWriteInput | undefined {
  const eventName = readStringMetadata(component, 'eventName')
  if (eventName === undefined) {
    return undefined
  }

  const eventSchema = readStringMetadata(component, 'eventSchema')
  return {
    type: 'event',
    name: component.name,
    domain: component.domain,
    module: component.module,
    eventName,
    sourceLocation,
    ...(eventSchema !== undefined && { eventSchema }),
  }
}

function toEventHandlerWriteInput(
  component: EnrichedComponent,
  sourceLocation: ReturnType<typeof toSourceLocation>,
): ComponentWriteInput | undefined {
  const subscribedEvents = readStringArrayMetadata(component, 'subscribedEvents')
  if (subscribedEvents === undefined) {
    return undefined
  }

  return {
    type: 'eventHandler',
    name: component.name,
    domain: component.domain,
    module: component.module,
    subscribedEvents,
    sourceLocation,
  }
}

function readStringMetadata(component: EnrichedComponent, field: string): string | undefined {
  const value = component.metadata[field]
  return typeof value === 'string' ? value : undefined
}

function readStringArrayMetadata(
  component: EnrichedComponent,
  field: string,
): string[] | undefined {
  const value = component.metadata[field]
  if (!Array.isArray(value)) {
    return undefined
  }

  return value.every((item) => typeof item === 'string') ? value : undefined
}

function readApiType(component: EnrichedComponent): 'REST' | 'GraphQL' | 'other' | undefined {
  const value = component.metadata['apiType']
  return value === 'REST' || value === 'GraphQL' || value === 'other' ? value : undefined
}

function readHttpMethod(
  component: EnrichedComponent,
): 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS' | undefined {
  const value = component.metadata['httpMethod']
  return value === 'GET' ||
    value === 'POST' ||
    value === 'PUT' ||
    value === 'PATCH' ||
    value === 'DELETE' ||
    value === 'HEAD' ||
    value === 'OPTIONS'
    ? value
    : undefined
}

function toComponentIdTypeSegment(type: string): string {
  if (type === 'useCase') {
    return 'usecase'
  }
  if (type === 'domainOp') {
    return 'domainop'
  }
  if (type === 'eventHandler') {
    return 'eventhandler'
  }
  return type
}
