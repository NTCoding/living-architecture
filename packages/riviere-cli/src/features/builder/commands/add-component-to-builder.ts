import type { RiviereBuilder } from '@living-architecture/riviere-builder'
import type { SourceLocation } from '@living-architecture/riviere-schema'
import { MissingRequiredOptionError } from '../../../platform/infra/errors/errors'
import {
  isValidApiType,
  type ComponentTypeFlag,
} from '../../../platform/infra/cli-presentation/component-types'
import { isValidHttpMethod } from '../../../platform/infra/cli-presentation/validation'
import { parseCustomProperties } from '../../../platform/infra/cli-presentation/custom-property-parser'

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

interface CommonInput {
  name: string
  domain: string
  module: string
  sourceLocation: SourceLocation
  description?: string
}

function addUI(builder: RiviereBuilder, common: CommonInput, options: AddComponentOptions): string {
  if (!options.route) throw new MissingRequiredOptionError('route', 'UI')
  return builder.addUI({
    ...common,
    route: options.route,
  }).id
}

function addAPI(
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
  if (options.httpMethod && isValidHttpMethod(options.httpMethod))
    input.httpMethod = options.httpMethod
  if (options.httpPath) input.path = options.httpPath
  return builder.addApi(input).id
}

function addUseCase(builder: RiviereBuilder, common: CommonInput): string {
  return builder.addUseCase(common).id
}

function addDomainOp(
  builder: RiviereBuilder,
  common: CommonInput,
  options: AddComponentOptions,
): string {
  if (!options.operationName) throw new MissingRequiredOptionError('operation-name', 'DomainOp')
  const input = {
    ...common,
    operationName: options.operationName,
  }
  return (
    options.entity
      ? builder.addDomainOp({
        ...input,
        entity: options.entity,
      })
      : builder.addDomainOp(input)
  ).id
}

function addEvent(
  builder: RiviereBuilder,
  common: CommonInput,
  options: AddComponentOptions,
): string {
  if (!options.eventName) throw new MissingRequiredOptionError('event-name', 'Event')
  return builder.addEvent({
    ...common,
    eventName: options.eventName,
    ...(options.eventSchema !== undefined && { eventSchema: options.eventSchema }),
  }).id
}

function addEventHandler(
  builder: RiviereBuilder,
  common: CommonInput,
  options: AddComponentOptions,
): string {
  if (!options.subscribedEvents)
    throw new MissingRequiredOptionError('subscribed-events', 'EventHandler')
  return builder.addEventHandler({
    ...common,
    subscribedEvents: options.subscribedEvents
      .split(',')
      .map((e) => e.trim())
      .filter((e) => e.length > 0),
  }).id
}

function addCustom(
  builder: RiviereBuilder,
  common: CommonInput,
  options: AddComponentOptions,
): string {
  if (!options.customType) throw new MissingRequiredOptionError('custom-type', 'Custom')
  const metadata = parseCustomProperties(options.customProperty)
  return builder.addCustom({
    ...common,
    customTypeName: options.customType,
    ...(metadata !== undefined && { metadata }),
  }).id
}

type ComponentAdder = (b: RiviereBuilder, c: CommonInput, o: AddComponentOptions) => string

const componentAdders: Record<ComponentTypeFlag, ComponentAdder> = {
  UI: addUI,
  API: addAPI,
  UseCase: addUseCase,
  DomainOp: addDomainOp,
  Event: addEvent,
  EventHandler: addEventHandler,
  Custom: addCustom,
}

export function addComponentToBuilder(
  builder: RiviereBuilder,
  componentType: ComponentTypeFlag,
  options: AddComponentOptions,
  sourceLocation: SourceLocation,
): string {
  const commonInput: CommonInput = {
    name: options.name,
    domain: options.domain,
    module: options.module,
    sourceLocation,
    ...(options.description ? { description: options.description } : {}),
  }
  return componentAdders[componentType](builder, commonInput, options)
}
