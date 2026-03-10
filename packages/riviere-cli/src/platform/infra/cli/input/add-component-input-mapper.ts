import type { SourceLocation } from '@living-architecture/riviere-schema'
import { isValidApiType } from './component-types'
import { isValidHttpMethod } from './validation'
import { parseCustomProperties } from './custom-property-parser'
import { MissingRequiredOptionError } from '../../errors/errors'
import type { AddComponentInput as DomainInput } from '../../../domain/add-component'

/** @riviere-role cli-input-mapper */
function isBlank(value: string | undefined): boolean {
  return !value || value.trim().length === 0
}

/** @riviere-role cli-input-mapper */
function resolveRequiredValue(value: string | undefined, option: string, type: string): string {
  if (value === undefined || isBlank(value)) {
    throw new MissingRequiredOptionError(option, type)
  }

  return value
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

/** @riviere-role cli-input-mapper */
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
    const route = resolveRequiredValue(input.route, 'route', 'UI')
    return {
      type: 'UI',
      input: {
        ...buildCommon(input),
        route: route.trim(),
      },
    }
  },
  API: (input) => {
    if (!input.apiType || !isValidApiType(input.apiType)) {
      throw new MissingRequiredOptionError('api-type', 'API')
    }
    const apiType = input.apiType
    const httpMethod =
      input.httpMethod === undefined ? undefined : normalizeHttpMethod(input.httpMethod)
    return {
      type: 'API',
      input: {
        ...buildCommon(input),
        apiType,
        ...(httpMethod ? { httpMethod } : {}),
        ...(input.httpPath ? { path: input.httpPath } : {}),
      },
    }
  },
  UseCase: (input) => ({
    type: 'UseCase',
    input: buildCommon(input),
  }),
  DomainOp: (input) => {
    const operationName = resolveRequiredValue(input.operationName, 'operation-name', 'DomainOp')
    return {
      type: 'DomainOp',
      input: {
        ...buildCommon(input),
        operationName: operationName.trim(),
        ...(input.entity ? { entity: input.entity } : {}),
      },
    }
  },
  Event: (input) => {
    const eventName = resolveRequiredValue(input.eventName, 'event-name', 'Event')
    return {
      type: 'Event',
      input: {
        ...buildCommon(input),
        eventName: eventName.trim(),
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
    const customType = resolveRequiredValue(input.customType, 'custom-type', 'Custom')
    const metadata = parseCustomProperties(input.customProperty)
    return {
      type: 'Custom',
      input: {
        ...buildCommon(input),
        customTypeName: customType.trim(),
        ...(metadata ? { metadata } : {}),
      },
    }
  },
}

/** @riviere-role cli-input-mapper */
function normalizeHttpMethod(value: string): 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' {
  if (!isValidHttpMethod(value)) {
    throw new MissingRequiredOptionError('http-method', 'API')
  }

  switch (value.toUpperCase()) {
    case 'GET': {
      return 'GET'
    }
    case 'POST': {
      return 'POST'
    }
    case 'PUT': {
      return 'PUT'
    }
    case 'PATCH': {
      return 'PATCH'
    }
    case 'DELETE': {
      return 'DELETE'
    }
    /* v8 ignore next -- normalizeHttpMethod guards with isValidHttpMethod before the switch */
    default: {
      throw new MissingRequiredOptionError('http-method', 'API')
    }
  }
}

/** @riviere-role cli-input-mapper */
export function buildDomainInput(input: AddComponentInput): DomainInput {
  const mapper = mappers[input.componentType]
  if (!mapper) throw new MissingRequiredOptionError('type', 'Component')
  return mapper(input)
}
