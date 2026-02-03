import type { SourceLocation } from '@living-architecture/riviere-schema'
import { isValidApiType } from '../cli-presentation/component-types'
import { isValidHttpMethod } from '../cli-presentation/validation'
import { parseCustomProperties } from '../cli-presentation/custom-property-parser'
import { MissingRequiredOptionError } from '../errors/errors'
import type { AddComponentInput as DomainInput } from '../../domain/add-component'

function isBlank(value: string | undefined): boolean {
  return !value || value.trim().length === 0
}

export interface AddComponentInput {
  componentType: string
  name: string
  domain: string
  module: string
  repository: string
  filePath: string
  graphPath: string
  lineNumber?: number
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
  outputJson: boolean
}

function buildCommon(input: AddComponentInput) {
  const sourceLocation: SourceLocation = {
    repository: input.repository,
    filePath: input.filePath,
    ...(input.lineNumber ? { lineNumber: input.lineNumber } : {}),
  }
  return {
    name: input.name,
    domain: input.domain,
    module: input.module,
    sourceLocation,
    ...(input.description ? { description: input.description } : {}),
  }
}

const mappers: Record<string, (input: AddComponentInput) => DomainInput> = {
  UI: (input) => {
    if (isBlank(input.route)) throw new MissingRequiredOptionError('route', 'UI')
    return {
      type: 'UI',
      input: {
        ...buildCommon(input),
        route: input.route.trim(),
      },
    }
  },
  API: (input) => {
    if (!input.apiType || !isValidApiType(input.apiType)) {
      throw new MissingRequiredOptionError('api-type', 'API')
    }
    if (input.httpMethod && !isValidHttpMethod(input.httpMethod)) {
      throw new MissingRequiredOptionError('http-method', 'API')
    }
    return {
      type: 'API',
      input: {
        ...buildCommon(input),
        apiType: input.apiType,
        ...(input.httpMethod ? { httpMethod: input.httpMethod } : {}),
        ...(input.httpPath ? { path: input.httpPath } : {}),
      },
    }
  },
  UseCase: (input) => ({
    type: 'UseCase',
    input: buildCommon(input),
  }),
  DomainOp: (input) => {
    if (isBlank(input.operationName))
      throw new MissingRequiredOptionError('operation-name', 'DomainOp')
    return {
      type: 'DomainOp',
      input: {
        ...buildCommon(input),
        operationName: input.operationName.trim(),
        ...(input.entity ? { entity: input.entity } : {}),
      },
    }
  },
  Event: (input) => {
    if (isBlank(input.eventName)) throw new MissingRequiredOptionError('event-name', 'Event')
    return {
      type: 'Event',
      input: {
        ...buildCommon(input),
        eventName: input.eventName.trim(),
        ...(input.eventSchema ? { eventSchema: input.eventSchema } : {}),
      },
    }
  },
  EventHandler: (input) => {
    if (!input.subscribedEvents)
      throw new MissingRequiredOptionError('subscribed-events', 'EventHandler')
    const subscribedEvents = input.subscribedEvents
      .split(',')
      .map((e) => e.trim())
      .filter((e) => e.length > 0)
    if (subscribedEvents.length === 0) {
      throw new MissingRequiredOptionError('subscribed-events', 'EventHandler')
    }
    return {
      type: 'EventHandler',
      input: {
        ...buildCommon(input),
        subscribedEvents,
      },
    }
  },
  Custom: (input) => {
    if (isBlank(input.customType)) throw new MissingRequiredOptionError('custom-type', 'Custom')
    const metadata = parseCustomProperties(input.customProperty)
    return {
      type: 'Custom',
      input: {
        ...buildCommon(input),
        customTypeName: input.customType.trim(),
        ...(metadata ? { metadata } : {}),
      },
    }
  },
}

export function buildDomainInput(input: AddComponentInput): DomainInput {
  const mapper = mappers[input.componentType]
  if (!mapper) throw new MissingRequiredOptionError('type', 'Component')
  return mapper(input)
}
