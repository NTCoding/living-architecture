/** @riviere-role published-language-data-structure */
export interface SourceLocation {
  repository: string
  filePath: string
  lineNumber?: number
  columnNumber?: number
  endLineNumber?: number
  methodName?: string
  url?: string
}

/** @riviere-role published-language-data-structure */
export interface OperationParameter {
  name: string
  type: string
  description?: string
}

/** @riviere-role published-language-data-structure */
export interface OperationSignature {
  parameters?: OperationParameter[]
  returnType?: string
}

/** @riviere-role published-language-data-structure */
export interface OperationBehavior {
  reads?: string[]
  validates?: string[]
  modifies?: string[]
  emits?: string[]
}

/** @riviere-role published-language-data-structure */
export interface StateTransition {
  from: string
  to: string
  trigger?: string
}

/** @riviere-role published-language-union */
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

/** @riviere-role published-language-data-structure */
export interface UIComponent extends ComponentBase {
  type: 'UI'
  route: string
}

/** @riviere-role published-language-union */
export type ApiType = 'REST' | 'GraphQL' | 'other'
/** @riviere-role published-language-union */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'

/** @riviere-role published-language-data-structure */
export interface APIComponent extends ComponentBase {
  type: 'API'
  apiType: ApiType
  httpMethod?: HttpMethod
  path?: string
  operationName?: string
}

/** @riviere-role published-language-data-structure */
export interface UseCaseComponent extends ComponentBase {
  type: 'UseCase'
}

/** @riviere-role published-language-data-structure */
export interface DomainOpComponent extends ComponentBase {
  type: 'DomainOp'
  operationName: string
  entity?: string
  signature?: OperationSignature
  behavior?: OperationBehavior
  stateChanges?: StateTransition[]
  businessRules?: string[]
}

/** Metadata field name on EventComponent holding the event's canonical name. */
/** @riviere-role published-language-field-name */
export const EVENT_NAME_FIELD = 'eventName' as const

/** Metadata field name on EventHandlerComponent holding the list of subscribed event names. */
/** @riviere-role published-language-field-name */
export const SUBSCRIBED_EVENTS_FIELD = 'subscribedEvents' as const

/** @riviere-role published-language-data-structure */
export interface EventComponent extends ComponentBase {
  type: 'Event'
  eventName: string
  eventSchema?: string
}

/** @riviere-role published-language-data-structure */
export interface EventHandlerComponent extends ComponentBase {
  type: 'EventHandler'
  subscribedEvents: string[]
}

/** @riviere-role published-language-data-structure */
export interface CustomComponent extends ComponentBase {
  type: 'Custom'
  customTypeName: string
  [key: string]: unknown
}

/** @riviere-role published-language-union */
export type Component =
  | UIComponent
  | APIComponent
  | UseCaseComponent
  | DomainOpComponent
  | EventComponent
  | EventHandlerComponent
  | CustomComponent

/** @riviere-role published-language-union */
export type LinkType = 'sync' | 'async'

/** @riviere-role published-language-data-structure */
export interface PayloadDefinition {
  type?: string
  schema?: Record<string, unknown>
}

/** @riviere-role published-language-data-structure */
export interface Link {
  id?: string
  source: string
  target: string
  type?: LinkType
  relationshipType?: string
  condition?: string
  payload?: PayloadDefinition
  sourceLocation?: SourceLocation
}

/** @riviere-role published-language-data-structure */
export interface ExternalTarget {
  name: string
  route?: string
  domain?: string
  repository?: string
  url?: string
  [key: string]: string | undefined
}

/** @riviere-role published-language-data-structure */
export interface ExternalLink {
  id?: string
  source: string
  target: ExternalTarget
  type?: LinkType
  description?: string
  sourceLocation?: SourceLocation
}

/** @riviere-role published-language-union */
export type SystemType = 'domain' | 'bff' | 'ui' | 'external-service' | 'other'

/** @riviere-role published-language-data-structure */
export interface DomainMetadata {
  description: string
  systemType: SystemType
}

/** @riviere-role published-language-data-structure */
export interface CustomPropertyDefinition {
  type: CustomPropertyTypeName
  description?: string
}

/** @riviere-role published-language-data-structure */
export interface CustomTypeDefinition {
  description?: string
  requiredProperties?: Record<string, CustomPropertyDefinition>
  optionalProperties?: Record<string, CustomPropertyDefinition>
}

/** @riviere-role published-language-data-structure */
export interface RelationshipTypeDefinition {
  description: string
}

/** @riviere-role published-language-data-structure */
export interface SourceInfo {
  repository: string
  commit?: string
  extractedAt?: string
}

/** @riviere-role published-language-data-structure */
export interface GraphMetadata {
  name?: string
  description?: string
  generated?: string
  sources?: SourceInfo[]
  domains: Record<string, DomainMetadata>
  customTypes?: Record<string, CustomTypeDefinition>
  relationshipTypes?: Record<string, RelationshipTypeDefinition>
}

/** @riviere-role published-language-schema */
export interface RiviereGraph {
  version: string
  metadata: GraphMetadata
  components: Component[]
  links: Link[]
  externalLinks?: ExternalLink[]
}
import type { CustomPropertyTypeName } from './custom-property-type'
