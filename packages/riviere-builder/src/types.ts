import type {
  ApiType,
  ComponentType,
  CustomPropertyDefinition,
  DomainMetadata,
  ExternalTarget,
  HttpMethod,
  LinkType,
  OperationBehavior,
  OperationSignature,
  SourceInfo,
  SourceLocation,
  StateTransition,
  SystemType,
} from '@living-architecture/riviere-schema'

export interface BuilderOptions {
  name?: string
  description?: string
  sources: SourceInfo[]
  domains: Record<string, DomainMetadata>
}

export interface DomainInput {
  name: string
  description: string
  systemType: SystemType
}

export interface UIInput {
  name: string
  domain: string
  module: string
  route: string
  description?: string
  sourceLocation: SourceLocation
  metadata?: Record<string, unknown>
}

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

export interface UseCaseInput {
  name: string
  domain: string
  module: string
  description?: string
  sourceLocation: SourceLocation
  metadata?: Record<string, unknown>
}

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

export interface EventHandlerInput {
  name: string
  domain: string
  module: string
  subscribedEvents: string[]
  description?: string
  sourceLocation: SourceLocation
  metadata?: Record<string, unknown>
}

export interface CustomTypeInput {
  name: string
  description?: string
  requiredProperties?: Record<string, CustomPropertyDefinition>
  optionalProperties?: Record<string, CustomPropertyDefinition>
}

export interface CustomInput {
  customTypeName: string
  name: string
  domain: string
  module: string
  description?: string
  sourceLocation: SourceLocation
  metadata?: Record<string, unknown>
}

export interface LinkInput {
  from: string
  to: string
  type?: LinkType
}

export interface ExternalLinkInput {
  from: string
  target: ExternalTarget
  type?: LinkType
  description?: string
  sourceLocation?: SourceLocation
  metadata?: Record<string, unknown>
}

export interface NearMatchQuery {
  name: string
  type?: ComponentType
  domain?: string
}

export interface NearMatchMismatch {
  field: 'type' | 'domain'
  expected: string
  actual: string
}

export interface NearMatchResult {
  component: import('@living-architecture/riviere-schema').Component
  score: number
  mismatch?: NearMatchMismatch | undefined
}

export interface NearMatchOptions {
  threshold?: number
  limit?: number
}

export interface BuilderStats {
  componentCount: number
  componentsByType: {
    UI: number
    API: number
    UseCase: number
    DomainOp: number
    Event: number
    EventHandler: number
    Custom: number
  }
  linkCount: number
  externalLinkCount: number
  domainCount: number
}

export type WarningCode = 'ORPHAN_COMPONENT' | 'UNUSED_DOMAIN'

export interface BuilderWarning {
  code: WarningCode
  message: string
  componentId?: string
  domainName?: string
}

export interface EnrichmentInput {
  entity?: string
  stateChanges?: StateTransition[]
  businessRules?: string[]
  behavior?: OperationBehavior
}
