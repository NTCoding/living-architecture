import type {
  ApiType,
  CustomPropertyDefinition,
  DomainMetadata,
  HttpMethod,
  OperationBehavior,
  OperationSignature,
  SourceInfo,
  SourceLocation,
  StateTransition,
  SystemType,
} from '@living-architecture/riviere-schema'

/** @riviere-role value-object */
export interface BuilderOptions {
  name?: string
  description?: string
  sources: SourceInfo[]
  domains: Record<string, DomainMetadata>
}

/** @riviere-role value-object */
export interface DomainInput {
  name: string
  description: string
  systemType: SystemType
}

/** @riviere-role value-object */
export interface UIInput {
  name: string
  domain: string
  module: string
  route: string
  description?: string
  sourceLocation: SourceLocation
  metadata?: Record<string, unknown>
}

/** @riviere-role value-object */
export interface APIInput {
  name: string
  domain: string
  module: string
  apiType: ApiType
  httpMethod?: HttpMethod
  path?: string
  operationName?: string
  description?: string
  sourceLocation: SourceLocation
  metadata?: Record<string, unknown>
}

/** @riviere-role value-object */
export interface UseCaseInput {
  name: string
  domain: string
  module: string
  description?: string
  sourceLocation: SourceLocation
  metadata?: Record<string, unknown>
}

/** @riviere-role value-object */
export interface DomainOpInput {
  name: string
  domain: string
  module: string
  operationName: string
  entity?: string
  signature?: OperationSignature
  behavior?: OperationBehavior
  stateChanges?: StateTransition[]
  businessRules?: string[]
  description?: string
  sourceLocation: SourceLocation
  metadata?: Record<string, unknown>
}

/** @riviere-role value-object */
export interface EventInput {
  name: string
  domain: string
  module: string
  eventName: string
  eventSchema?: string
  description?: string
  sourceLocation: SourceLocation
  metadata?: Record<string, unknown>
}

/** @riviere-role value-object */
export interface EventHandlerInput {
  name: string
  domain: string
  module: string
  subscribedEvents: string[]
  description?: string
  sourceLocation: SourceLocation
  metadata?: Record<string, unknown>
}

/** @riviere-role value-object */
export interface CustomTypeInput {
  name: string
  description?: string
  requiredProperties?: Record<string, CustomPropertyDefinition>
  optionalProperties?: Record<string, CustomPropertyDefinition>
}

/** @riviere-role value-object */
export interface CustomInput {
  customTypeName: string
  name: string
  domain: string
  module: string
  description?: string
  sourceLocation: SourceLocation
  metadata?: Record<string, unknown>
}
