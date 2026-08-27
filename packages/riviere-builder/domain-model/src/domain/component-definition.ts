import type {
  APIComponent,
  Component,
  CustomComponent,
  DomainOpComponent,
  EventComponent,
  EventHandlerComponent,
  UIComponent,
  UseCaseComponent,
} from '@living-architecture/riviere-schema-published-language/schema'
import { ComponentId } from '@living-architecture/riviere-schema-published-language/component-id'
import { ComponentType } from './component-type'
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
type UIDefinition = { type: 'UI'; input: CommonInput & { route: string } }
type APIDefinition = {
  type: 'API'
  input: CommonInput & {
    apiType: ApiDefinition['apiType']
    httpMethod?: NonNullable<ApiDefinition['httpMethod']>
    path?: string
    operationName?: string
  }
}
type UseCaseDefinition = { type: 'UseCase'; input: CommonInput }
type DomainOpDefinition = {
  type: 'DomainOp'
  input: Omit<DomainOpComponent, 'id' | 'type'>
}
type EventDefinition = { type: 'Event'; input: Omit<EventComponent, 'id' | 'type'> }
type EventHandlerDefinition = {
  type: 'EventHandler'
  input: Omit<EventHandlerComponent, 'id' | 'type'>
}
type CustomDefinition = {
  type: 'Custom'
  input: CommonInput & {
    customTypeName: string
    metadata?: Readonly<Record<string, unknown>>
  }
}
type ComponentDefinitionValue =
  | UIDefinition
  | APIDefinition
  | UseCaseDefinition
  | DomainOpDefinition
  | EventDefinition
  | EventHandlerDefinition
  | CustomDefinition

type ParsedValue =
  | { success: true; data: ComponentDefinitionValue }
  | { success: false; message: string }

/** @riviere-role value-object */
export class ComponentDefinition<T extends ComponentDefinitionValue = ComponentDefinitionValue> {
  declare private readonly brand: 'ComponentDefinition'

  private constructor(readonly value: T) {}

  static parse(input: ComponentDefinitionInput) {
    const componentType = ComponentType.parse(input.componentType)
    if (!componentType.success) return invalid(`Invalid component type: ${input.componentType}`)
    const parsed = parseValue(componentType.data.value, commonInput(input), input)
    return parsed.success
      ? { success: true as const, data: new ComponentDefinition(parsed.data) }
      : parsed
  }

  static parseUI(input: UIDefinition['input']): ComponentDefinition<UIDefinition> {
    return new ComponentDefinition({ type: 'UI', input })
  }

  static parseAPI(input: APIDefinition['input']): ComponentDefinition<APIDefinition> {
    return new ComponentDefinition({ type: 'API', input })
  }

  static parseUseCase(input: UseCaseDefinition['input']): ComponentDefinition<UseCaseDefinition> {
    return new ComponentDefinition({ type: 'UseCase', input })
  }

  static parseDomainOp(
    input: DomainOpDefinition['input'],
  ): ComponentDefinition<DomainOpDefinition> {
    return new ComponentDefinition({ type: 'DomainOp', input })
  }

  static parseEvent(input: EventDefinition['input']): ComponentDefinition<EventDefinition> {
    return new ComponentDefinition({ type: 'Event', input })
  }

  static parseEventHandler(
    input: EventHandlerDefinition['input'],
  ): ComponentDefinition<EventHandlerDefinition> {
    return new ComponentDefinition({ type: 'EventHandler', input })
  }

  static parseCustom(input: CustomDefinition['input']): ComponentDefinition<CustomDefinition> {
    return new ComponentDefinition({ type: 'Custom', input })
  }

  publishedUI(this: ComponentDefinition<UIDefinition>): UIComponent {
    return { id: componentId(this.value.input, 'ui'), type: 'UI', ...this.value.input }
  }

  publishedAPI(this: ComponentDefinition<APIDefinition>): APIComponent {
    return { id: componentId(this.value.input, 'api'), type: 'API', ...this.value.input }
  }

  publishedUseCase(this: ComponentDefinition<UseCaseDefinition>): UseCaseComponent {
    return { id: componentId(this.value.input, 'usecase'), type: 'UseCase', ...this.value.input }
  }

  publishedDomainOp(this: ComponentDefinition<DomainOpDefinition>): DomainOpComponent {
    return { id: componentId(this.value.input, 'domainop'), type: 'DomainOp', ...this.value.input }
  }

  publishedEvent(this: ComponentDefinition<EventDefinition>): EventComponent {
    return { id: componentId(this.value.input, 'event'), type: 'Event', ...this.value.input }
  }

  publishedEventHandler(this: ComponentDefinition<EventHandlerDefinition>): EventHandlerComponent {
    return {
      id: componentId(this.value.input, 'eventhandler'),
      type: 'EventHandler',
      ...this.value.input,
    }
  }

  publishedCustom(this: ComponentDefinition<CustomDefinition>): CustomComponent {
    const { metadata, ...input } = this.value.input
    return { id: componentId(input, 'custom'), type: 'Custom', ...input, ...metadata }
  }
}

function componentId(input: CommonInput, type: string): string {
  return ComponentId.parseFromParts({ ...input, type }).toString()
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
