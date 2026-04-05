import type { SourceLocation } from '@living-architecture/riviere-schema'
import type {
  addComponentToBuilder, AddComponentInput as DomainInput 
} from './add-component'

interface AddComponentValidationError {
  kind: 'ADD_COMPONENT_VALIDATION_ERROR'
  message: string
}

interface AddComponentCommandInput {
  componentType: string
  name: string
  domain: string
  module: string
  repository: string
  filePath: string
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
}

type CommonInput = Exclude<Parameters<typeof addComponentToBuilder>[1], { type: 'API' }>['input']

/** @riviere-role domain-service */
export function createDomainInput(input: AddComponentCommandInput): DomainInput {
  const commonInput = createCommonInput(input)

  switch (input.componentType) {
    case 'UI':
      return createUiInput(commonInput, input)
    case 'API':
      return createApiInput(commonInput, input)
    case 'UseCase':
      return {
        type: 'UseCase',
        input: commonInput,
      }
    case 'DomainOp':
      return createDomainOpInput(commonInput, input)
    case 'Event':
      return createEventInput(commonInput, input)
    case 'EventHandler':
      return createEventHandlerInput(commonInput, input)
    case 'Custom':
      return createCustomInput(commonInput, input)
    default:
      throw validationError(`Invalid component type: ${input.componentType}`)
  }
}

/** @riviere-role domain-service */
export function isAddComponentValidationError(
  error: unknown,
): error is AddComponentValidationError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'kind' in error &&
    error.kind === 'ADD_COMPONENT_VALIDATION_ERROR' &&
    'message' in error &&
    typeof error.message === 'string'
  )
}

function createCommonInput(input: AddComponentCommandInput): CommonInput {
  const sourceLocation: SourceLocation = {
    repository: input.repository,
    filePath: input.filePath,
    ...(input.lineNumber === undefined ? {} : { lineNumber: input.lineNumber }),
  }

  return {
    name: input.name,
    domain: input.domain,
    module: input.module,
    sourceLocation,
    ...(input.description === undefined ? {} : { description: input.description }),
  }
}

function createUiInput(commonInput: CommonInput, input: AddComponentCommandInput): DomainInput {
  return {
    type: 'UI',
    input: {
      ...commonInput,
      route: requireOption(input.route, 'route', 'UI'),
    },
  }
}

function createApiInput(commonInput: CommonInput, input: AddComponentCommandInput): DomainInput {
  const apiType = normalizeApiType(requireOption(input.apiType, 'api-type', 'API'))
  const httpMethod = normalizeHttpMethod(input.httpMethod)

  return {
    type: 'API',
    input: {
      ...commonInput,
      apiType,
      ...(httpMethod === undefined ? {} : { httpMethod }),
      ...(input.httpPath === undefined ? {} : { path: input.httpPath }),
    },
  }
}

function createDomainOpInput(
  commonInput: CommonInput,
  input: AddComponentCommandInput,
): DomainInput {
  return {
    type: 'DomainOp',
    input: {
      ...commonInput,
      operationName: requireOption(input.operationName, 'operation-name', 'DomainOp'),
      ...(input.entity === undefined ? {} : { entity: input.entity }),
    },
  }
}

function createEventInput(commonInput: CommonInput, input: AddComponentCommandInput): DomainInput {
  return {
    type: 'Event',
    input: {
      ...commonInput,
      eventName: requireOption(input.eventName, 'event-name', 'Event'),
      ...(input.eventSchema === undefined ? {} : { eventSchema: input.eventSchema }),
    },
  }
}

function createEventHandlerInput(
  commonInput: CommonInput,
  input: AddComponentCommandInput,
): DomainInput {
  return {
    type: 'EventHandler',
    input: {
      ...commonInput,
      subscribedEvents: parseSubscribedEvents(input.subscribedEvents),
    },
  }
}

function createCustomInput(commonInput: CommonInput, input: AddComponentCommandInput): DomainInput {
  const metadata = parseCustomProperties(input.customProperty)

  return {
    type: 'Custom',
    input: {
      ...commonInput,
      customTypeName: requireOption(input.customType, 'custom-type', 'Custom'),
      ...(metadata === undefined ? {} : { metadata }),
    },
  }
}

function normalizeApiType(value: string): 'REST' | 'GraphQL' | 'other' {
  switch (value.toLowerCase()) {
    case 'rest':
      return 'REST'
    case 'graphql':
      return 'GraphQL'
    case 'other':
      return 'other'
    default:
      throw validationError('--api-type is required for API component')
  }
}

function normalizeHttpMethod(
  value: string | undefined,
): 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | undefined {
  if (value === undefined) {
    return undefined
  }

  switch (value.toUpperCase()) {
    case 'GET':
      return 'GET'
    case 'POST':
      return 'POST'
    case 'PUT':
      return 'PUT'
    case 'DELETE':
      return 'DELETE'
    case 'PATCH':
      return 'PATCH'
    default:
      throw validationError('--http-method is required for API component')
  }
}

function requireOption(
  value: string | undefined,
  optionName: string,
  componentType: string,
): string {
  if (value === undefined || value.trim().length === 0) {
    throw validationError(`--${optionName} is required for ${componentType} component`)
  }

  return value.trim()
}

function parseSubscribedEvents(value: string | undefined): string[] {
  if (value === undefined) {
    throw validationError('--subscribed-events is required for EventHandler component')
  }

  const subscribedEvents = value
    .split(',')
    .map((eventName) => eventName.trim())
    .filter((eventName) => eventName.length > 0)

  if (subscribedEvents.length === 0) {
    throw validationError('--subscribed-events is required for EventHandler component')
  }

  return subscribedEvents
}

function parseCustomProperties(
  properties: string[] | undefined,
): Record<string, string> | undefined {
  if (properties === undefined || properties.length === 0) {
    return undefined
  }

  const metadata: Record<string, string> = {}
  for (const property of properties) {
    const colonIndex = property.indexOf(':')
    if (colonIndex === -1) {
      throw validationError(`Invalid custom property format: ${property}. Expected 'key:value'`)
    }

    const key = property.slice(0, colonIndex)
    const value = property.slice(colonIndex + 1)
    metadata[key] = value
  }

  return metadata
}

function validationError(message: string): AddComponentValidationError {
  return {
    kind: 'ADD_COMPONENT_VALIDATION_ERROR',
    message,
  }
}
