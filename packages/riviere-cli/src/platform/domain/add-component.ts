import type { RiviereBuilder } from '@living-architecture/riviere-builder'
import type { SourceLocation } from '@living-architecture/riviere-schema'

interface CommonInput {
  name: string
  domain: string
  module: string
  sourceLocation: SourceLocation
  description?: string
}

export interface AddUIInput extends CommonInput {route: string}

export interface AddAPIInput extends CommonInput {
  apiType: 'REST' | 'GraphQL' | 'other'
  httpMethod?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  path?: string
}

export type AddUseCaseInput = CommonInput

export interface AddDomainOpInput extends CommonInput {
  operationName: string
  entity?: string
}

export interface AddEventInput extends CommonInput {
  eventName: string
  eventSchema?: string
}

export interface AddEventHandlerInput extends CommonInput {subscribedEvents: string[]}

export interface AddCustomInput extends CommonInput {
  customTypeName: string
  metadata?: Record<string, unknown>
}

export type AddComponentInput =
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
    input: AddUseCaseInput
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
