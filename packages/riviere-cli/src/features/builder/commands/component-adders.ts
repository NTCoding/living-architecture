import type { RiviereBuilder } from '@living-architecture/riviere-builder'
import type { SourceLocation } from '@living-architecture/riviere-schema'
import { MissingRequiredOptionError } from '../../../platform/infra/errors/errors'
import { isValidApiType } from '../../../platform/infra/cli-presentation/component-types'
import { isValidHttpMethod } from '../../../platform/infra/cli-presentation/validation'

export interface AddComponentOptions {
  type: string
  name: string
  domain: string
  module: string
  repository: string
  filePath: string
  route?: string
  apiType?: string
  httpMethod?: string
  httpPath?: string
  operationName?: string
  entity?: string
  eventName?: string
  eventSchema?: string
  subscribedEvents?: string
  customType?: string
  customProperty?: string[]
  description?: string
  lineNumber?: string
  graph?: string
  json?: boolean
}

export interface CommonInput {
  name: string
  domain: string
  module: string
  sourceLocation: SourceLocation
  description?: string
}

export function addUIComponent(
  builder: RiviereBuilder,
  common: CommonInput,
  options: AddComponentOptions,
): string {
  if (!options.route) {
    throw new MissingRequiredOptionError('route', 'UI')
  }
  const component = builder.addUI({
    ...common,
    route: options.route,
  })
  return component.id
}

export function addAPIComponent(
  builder: RiviereBuilder,
  common: CommonInput,
  options: AddComponentOptions,
): string {
  if (!options.apiType || !isValidApiType(options.apiType)) {
    throw new MissingRequiredOptionError('api-type', 'API')
  }
  const input: Parameters<RiviereBuilder['addApi']>[0] = {
    ...common,
    apiType: options.apiType,
  }
  if (options.httpMethod && isValidHttpMethod(options.httpMethod)) {
    input.httpMethod = options.httpMethod
  }
  if (options.httpPath) {
    input.path = options.httpPath
  }
  const component = builder.addApi(input)
  return component.id
}

export function addUseCaseComponent(builder: RiviereBuilder, common: CommonInput): string {
  const component = builder.addUseCase(common)
  return component.id
}

export function addDomainOpComponent(
  builder: RiviereBuilder,
  common: CommonInput,
  options: AddComponentOptions,
): string {
  if (!options.operationName) {
    throw new MissingRequiredOptionError('operation-name', 'DomainOp')
  }
  const input = {
    ...common,
    operationName: options.operationName,
  }
  const component = options.entity
    ? builder.addDomainOp({
      ...input,
      entity: options.entity,
    })
    : builder.addDomainOp(input)
  return component.id
}

export function addEventComponent(
  builder: RiviereBuilder,
  common: CommonInput,
  options: AddComponentOptions,
): string {
  if (!options.eventName) {
    throw new MissingRequiredOptionError('event-name', 'Event')
  }
  const component = builder.addEvent({
    ...common,
    eventName: options.eventName,
    ...(options.eventSchema !== undefined && { eventSchema: options.eventSchema }),
  })
  return component.id
}

export function addEventHandlerComponent(
  builder: RiviereBuilder,
  common: CommonInput,
  options: AddComponentOptions,
): string {
  if (!options.subscribedEvents) {
    throw new MissingRequiredOptionError('subscribed-events', 'EventHandler')
  }
  const component = builder.addEventHandler({
    ...common,
    subscribedEvents: options.subscribedEvents
      .split(',')
      .map((e) => e.trim())
      .filter((e) => e.length > 0),
  })
  return component.id
}
