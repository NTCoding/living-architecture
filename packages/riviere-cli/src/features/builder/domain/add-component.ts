import type { RiviereBuilder } from '@living-architecture/riviere-builder/features/building/domain/builder-facade'
import type { SourceLocation } from '@living-architecture/riviere-schema'

type CommonInput = {
  name: string
  domain: string
  module: string
  sourceLocation: SourceLocation
  description?: string
}

interface AddUIInput extends CommonInput {route: string}

interface AddAPIInput extends CommonInput {
  apiType: 'REST' | 'GraphQL' | 'other'
  httpMethod?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  path?: string
}

interface AddDomainOpInput extends CommonInput {
  operationName: string
  entity?: string
}

interface AddEventInput extends CommonInput {
  eventName: string
  eventSchema?: string
}

interface AddEventHandlerInput extends CommonInput {subscribedEvents: string[]}

interface AddCustomInput extends CommonInput {
  customTypeName: string
  metadata?: Record<string, unknown>
}

type AddComponentInput =
  | {
    type: 'UI'
    input: AddUIInput
  }
  | {
    type: 'API'
    input: AddAPIInput
  }
  | {
    type: 'UseCase'
    input: CommonInput
  }
  | {
    type: 'DomainOp'
    input: AddDomainOpInput
  }
  | {
    type: 'Event'
    input: AddEventInput
  }
  | {
    type: 'EventHandler'
    input: AddEventHandlerInput
  }
  | {
    type: 'Custom'
    input: AddCustomInput
  }

/** @riviere-role domain-service */
export function addComponentToBuilder(
  builder: RiviereBuilder,
  component: AddComponentInput,
): string {
  switch (component.type) {
    case 'UI':
      return builder.addUI(component.input).id
    case 'API':
      return builder.addApi(component.input).id
    case 'UseCase':
      return builder.addUseCase(component.input).id
    case 'DomainOp':
      return builder.addDomainOp(component.input).id
    case 'Event':
      return builder.addEvent(component.input).id
    case 'EventHandler':
      return builder.addEventHandler(component.input).id
    case 'Custom':
      return builder.addCustom(component.input).id
  }
}
