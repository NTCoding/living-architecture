import {
  CustomTypeNotFoundError,
  DomainNotFoundError,
  DuplicateComponentError,
} from '@living-architecture/riviere-builder'
import type { SourceLocation } from '@living-architecture/riviere-schema'
import {
  addComponentToBuilder,
  type AddComponentInput as DomainInput,
} from '../../../platform/domain/add-component'
import { RiviereBuilderRepository } from '../infra/persistence/riviere-builder-repository'
import type { AddComponentInput } from './add-component-input'
import type { AddComponentErrorCode, AddComponentResult } from './add-component-result'

const validComponentTypes = new Set([
  'ui',
  'api',
  'usecase',
  'domainop',
  'event',
  'eventhandler',
  'custom',
])

/** @riviere-role command-use-case */
export async function addComponent(input: AddComponentInput): Promise<AddComponentResult> {
  if (!validComponentTypes.has(input.componentType.toLowerCase())) {
    return failure('VALIDATION_ERROR', `Invalid component type: ${input.componentType}`)
  }

  if (
    input.lineNumber !== undefined &&
    (!Number.isInteger(input.lineNumber) || input.lineNumber < 1)
  ) {
    return failure('VALIDATION_ERROR', 'Invalid line number: must be a positive integer')
  }

  const repository = new RiviereBuilderRepository()

  const loadedGraph = await repository.load(input.graphPathOption)
  if (!loadedGraph.success) {
    if (loadedGraph.code === 'GRAPH_NOT_FOUND') {
      return failure('GRAPH_NOT_FOUND', `Graph not found at ${loadedGraph.graphPath}`)
    }

    return failure('VALIDATION_ERROR', 'Graph file contains invalid JSON')
  }

  try {
    const componentId = addComponentToBuilder(loadedGraph.builder, createDomainInput(input))
    await repository.save(loadedGraph.builder, input.graphPathOption)
    return {
      success: true,
      componentId,
    }
  } catch (error) {
    return mapError(error)
  }
}

function createDomainInput(input: AddComponentInput): DomainInput {
  const sourceLocation: SourceLocation = {
    repository: input.repository,
    filePath: input.filePath,
    ...(input.lineNumber === undefined ? {} : { lineNumber: input.lineNumber }),
  }
  const commonInput = {
    name: input.name,
    domain: input.domain,
    module: input.module,
    sourceLocation,
    ...(input.description === undefined ? {} : { description: input.description }),
  }

  switch (input.componentType) {
    case 'UI':
      return {
        type: 'UI',
        input: {
          ...commonInput,
          route: requireOption(input.route, 'route', 'UI'),
        },
      }
    case 'API': {
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
    case 'UseCase':
      return {
        type: 'UseCase',
        input: commonInput,
      }
    case 'DomainOp':
      return {
        type: 'DomainOp',
        input: {
          ...commonInput,
          operationName: requireOption(input.operationName, 'operation-name', 'DomainOp'),
          ...(input.entity === undefined ? {} : { entity: input.entity }),
        },
      }
    case 'Event':
      return {
        type: 'Event',
        input: {
          ...commonInput,
          eventName: requireOption(input.eventName, 'event-name', 'Event'),
          ...(input.eventSchema === undefined ? {} : { eventSchema: input.eventSchema }),
        },
      }
    case 'EventHandler':
      return {
        type: 'EventHandler',
        input: {
          ...commonInput,
          subscribedEvents: parseSubscribedEvents(input.subscribedEvents),
        },
      }
    case 'Custom': {
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
    default:
      throw new Error(`Invalid component type: ${input.componentType}`)
  }
}

function mapError(error: unknown): AddComponentResult {
  if (error instanceof DomainNotFoundError) {
    return failure('DOMAIN_NOT_FOUND', error.message)
  }
  if (error instanceof CustomTypeNotFoundError) {
    return failure('CUSTOM_TYPE_NOT_FOUND', error.message)
  }
  if (error instanceof DuplicateComponentError) {
    return failure('DUPLICATE_COMPONENT', error.message)
  }
  if (error instanceof Error) {
    return failure('VALIDATION_ERROR', error.message)
  }
  throw error
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
      throw new Error('--api-type is required for API component')
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
      throw new Error('--http-method is required for API component')
  }
}

function requireOption(
  value: string | undefined,
  optionName: string,
  componentType: string,
): string {
  if (value === undefined || value.trim().length === 0) {
    throw new Error(`--${optionName} is required for ${componentType} component`)
  }

  return value.trim()
}

function parseSubscribedEvents(value: string | undefined): string[] {
  if (value === undefined) {
    throw new Error('--subscribed-events is required for EventHandler component')
  }

  const subscribedEvents = value
    .split(',')
    .map((eventName) => eventName.trim())
    .filter((eventName) => eventName.length > 0)

  if (subscribedEvents.length === 0) {
    throw new Error('--subscribed-events is required for EventHandler component')
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
      throw new Error(`Invalid custom property format: ${property}. Expected 'key:value'`)
    }
    const key = property.slice(0, colonIndex)
    const value = property.slice(colonIndex + 1)
    metadata[key] = value
  }
  return metadata
}

function failure(code: AddComponentErrorCode, message: string): AddComponentResult {
  return {
    success: false,
    code,
    message,
  }
}
