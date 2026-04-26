import type { RiviereBuilder } from '@living-architecture/riviere-builder'
import type { SourceLocation } from '@living-architecture/riviere-schema'

interface CommonInput {
  name: string
  domain: string
  module: string
  sourceLocation: SourceLocation
  description?: string
}

/** @riviere-role value-object */
export interface AddUIInput extends CommonInput {route: string}

/** @riviere-role value-object */
export interface AddAPIInput extends CommonInput {
  apiType: 'REST' | 'GraphQL' | 'other'
  httpMethod?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  path?: string
}

/** @riviere-role value-object */
export type AddUseCaseInput = CommonInput

/** @riviere-role value-object */
export interface AddDomainOpInput extends CommonInput {
  operationName: string
  entity?: string
}

/** @riviere-role value-object */
export interface AddEventInput extends CommonInput {
  eventName: string
  eventSchema?: string
}

/** @riviere-role value-object */
export interface AddEventHandlerInput extends CommonInput {subscribedEvents: string[]}

/** @riviere-role value-object */
export interface AddCustomInput extends CommonInput {
  customTypeName: string
  metadata?: Record<string, unknown>
}

/** @riviere-role value-object */
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
