import type { Component } from '@living-architecture/riviere-schema/schema'
import { ComponentType } from '../../../platform/domain/component-type'
import { ApiDefinition } from './api-definition'
import { CustomComponentDefinition } from './custom-component-definition'
import { SubscribedEvents } from './subscribed-events'

interface ComponentDefinitionInput {
  componentType: string
  name: string
  domain: string
  module: string
  repository: string
  filePath: string
  lineNumber?: number
  columnNumber?: number
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

type CommonInput = Pick<Component, 'name' | 'domain' | 'module' | 'description' | 'sourceLocation'>
type ComponentDefinitionValue =
  | { type: 'UI'; input: CommonInput & { route: string } }
  | {
      type: 'API'
      input: CommonInput & {
        apiType: ApiDefinition['apiType']
        httpMethod?: NonNullable<ApiDefinition['httpMethod']>
        path?: string
      }
    }
  | { type: 'UseCase'; input: CommonInput }
  | { type: 'DomainOp'; input: CommonInput & { operationName: string; entity?: string } }
  | { type: 'Event'; input: CommonInput & { eventName: string; eventSchema?: string } }
  | { type: 'EventHandler'; input: CommonInput & { subscribedEvents: string[] } }
  | {
      type: 'Custom'
      input: CommonInput & {
        customTypeName: string
        metadata?: NonNullable<CustomComponentDefinition['metadata']>
      }
    }

type ParsedValue =
  | { success: true; data: ComponentDefinitionValue }
  | { success: false; message: string }

/** @riviere-role value-object */
export class ComponentDefinition {
  declare private readonly brand: 'ComponentDefinition'

  private constructor(readonly value: ComponentDefinitionValue) {}

  static parse(input: ComponentDefinitionInput) {
    const componentType = ComponentType.parse(input.componentType)
    if (!componentType.success) return invalid(`Invalid component type: ${input.componentType}`)
    const parsed = parseValue(componentType.data.value, commonInput(input), input)
    return parsed.success
      ? { success: true as const, data: new ComponentDefinition(parsed.data) }
      : parsed
  }
}

function parseValue(
  type: ComponentDefinitionValue['type'],
  common: CommonInput,
  input: ComponentDefinitionInput,
): ParsedValue {
  switch (type) {
    case 'UI':
      return required(input.route, '--route is required for UI component', (route) => ({
        type,
        input: { ...common, route },
      }))
    case 'API':
      return parseApi(common, input)
    case 'UseCase':
      return valid({ type, input: common })
    case 'DomainOp':
      return required(
        input.operationName,
        '--operation-name is required for DomainOp component',
        (operationName) => ({
          type,
          input: {
            ...common,
            operationName,
            ...(input.entity === undefined ? {} : { entity: input.entity }),
          },
        }),
      )
    case 'Event':
      return required(
        input.eventName,
        '--event-name is required for Event component',
        (eventName) => ({
          type,
          input: {
            ...common,
            eventName,
            ...(input.eventSchema === undefined ? {} : { eventSchema: input.eventSchema }),
          },
        }),
      )
    case 'EventHandler':
      return parseEventHandler(common, input.subscribedEvents)
    case 'Custom':
      return parseCustom(common, input)
  }
}

function parseApi(common: CommonInput, input: ComponentDefinitionInput): ParsedValue {
  const parsed = ApiDefinition.parse(input.apiType, input.httpMethod, input.httpPath)
  return parsed.success
    ? valid({
        type: 'API',
        input: {
          ...common,
          apiType: parsed.data.apiType,
          ...(parsed.data.httpMethod === undefined ? {} : { httpMethod: parsed.data.httpMethod }),
          ...(parsed.data.path === undefined ? {} : { path: parsed.data.path }),
        },
      })
    : parsed
}

function parseEventHandler(common: CommonInput, value: string | undefined): ParsedValue {
  const parsed = SubscribedEvents.parse(value)
  return parsed.success
    ? valid({
        type: 'EventHandler',
        input: { ...common, subscribedEvents: [...parsed.data.values] },
      })
    : parsed
}

function parseCustom(common: CommonInput, input: ComponentDefinitionInput): ParsedValue {
  const parsed = CustomComponentDefinition.parse(input.customType, input.customProperty)
  return parsed.success
    ? valid({
        type: 'Custom',
        input: {
          ...common,
          customTypeName: parsed.data.customTypeName,
          ...(parsed.data.metadata === undefined ? {} : { metadata: parsed.data.metadata }),
        },
      })
    : parsed
}

function commonInput(input: ComponentDefinitionInput): CommonInput {
  return {
    name: input.name,
    domain: input.domain,
    module: input.module,
    sourceLocation: {
      repository: input.repository,
      filePath: input.filePath,
      ...(input.lineNumber === undefined ? {} : { lineNumber: input.lineNumber }),
      ...(input.columnNumber === undefined ? {} : { columnNumber: input.columnNumber }),
    },
    ...(input.description === undefined ? {} : { description: input.description }),
  }
}

function required(
  value: string | undefined,
  message: string,
  create: (value: string) => ComponentDefinitionValue,
): ParsedValue {
  return value === undefined || value.trim().length === 0
    ? invalid(message)
    : valid(create(value.trim()))
}

function valid(data: ComponentDefinitionValue): ParsedValue {
  return { success: true, data }
}
function invalid(message: string) {
  return { success: false as const, message }
}
