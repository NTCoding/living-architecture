export interface SourceLocation {
  repository: string
  filePath: string
  lineNumber?: number
  endLineNumber?: number
  methodName?: string
  url?: string
}

export interface OperationParameter {
  name: string
  type: string
  description?: string
}

export interface OperationSignature {
  parameters?: OperationParameter[]
  returnType?: string
}

export interface OperationBehavior {
  reads?: string[]
  validates?: string[]
  modifies?: string[]
  emits?: string[]
}

export interface StateTransition {
  from: string
  to: string
  trigger?: string
}

export type ComponentType =
  | 'UI'
  | 'API'
  | 'UseCase'
  | 'DomainOp'
  | 'Event'
  | 'EventHandler'
  | 'Custom'

interface ComponentBase {
  id: string
  name: string
  domain: string
  module: string
  description?: string
  sourceLocation: SourceLocation
}

export interface UIComponent extends ComponentBase {
  type: 'UI'
  route: string
}

export type ApiType = 'REST' | 'GraphQL' | 'other'
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'

export interface APIComponent extends ComponentBase {
  type: 'API'
  apiType: ApiType
  httpMethod?: HttpMethod
  path?: string
  operationName?: string
}

export interface UseCaseComponent extends ComponentBase {type: 'UseCase'}

export interface DomainOpComponent extends ComponentBase {
  type: 'DomainOp'
  operationName: string
  entity?: string
  signature?: OperationSignature
  behavior?: OperationBehavior
  stateChanges?: StateTransition[]
  businessRules?: string[]
}

export interface EventComponent extends ComponentBase {
  type: 'Event'
  eventName: string
  eventSchema?: string
}

export interface EventHandlerComponent extends ComponentBase {
  type: 'EventHandler'
  subscribedEvents: string[]
}

export interface CustomComponent extends ComponentBase {
  type: 'Custom'
  customTypeName: string
  [key: string]: unknown
}

export type Component =
  | UIComponent
  | APIComponent
  | UseCaseComponent
  | DomainOpComponent
  | EventComponent
  | EventHandlerComponent
  | CustomComponent

export type LinkType = 'sync' | 'async'

export interface PayloadDefinition {
  type?: string
  schema?: Record<string, unknown>
}

export interface Link {
  id?: string
  source: string
  target: string
  type?: LinkType
  payload?: PayloadDefinition
  sourceLocation?: SourceLocation
}

export interface ExternalTarget {
  name: string
  domain?: string
  repository?: string
  url?: string
}

export interface ExternalLink {
  id?: string
  source: string
  target: ExternalTarget
  type?: LinkType
  description?: string
  sourceLocation?: SourceLocation
}

export type SystemType = 'domain' | 'bff' | 'ui' | 'other'

export interface DomainMetadata {
  description: string
  systemType: SystemType
  [key: string]: unknown
}

export type CustomPropertyType = 'string' | 'number' | 'boolean' | 'array' | 'object'

export interface CustomPropertyDefinition {
  type: CustomPropertyType
  description?: string
}

export interface CustomTypeDefinition {
  description?: string
  requiredProperties?: Record<string, CustomPropertyDefinition>
  optionalProperties?: Record<string, CustomPropertyDefinition>
}

export interface SourceInfo {
  repository: string
  commit?: string
  extractedAt?: string
}

export interface GraphMetadata {
  name?: string
  description?: string
  generated?: string
  sources?: SourceInfo[]
  domains: Record<string, DomainMetadata>
  customTypes?: Record<string, CustomTypeDefinition>
}

export interface RiviereGraph {
  version: string
  metadata: GraphMetadata
  components: Component[]
  links: Link[]
  externalLinks?: ExternalLink[]
}
