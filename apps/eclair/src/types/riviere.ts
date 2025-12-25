import { z } from 'zod'

export const NodeIdSchema = z.string().min(1).brand<'NodeId'>()
export type NodeId = z.infer<typeof NodeIdSchema>

export const EdgeIdSchema = z.string().min(1).brand<'EdgeId'>()
export type EdgeId = z.infer<typeof EdgeIdSchema>

export const DomainNameSchema = z.string().min(1).brand<'DomainName'>()
export type DomainName = z.infer<typeof DomainNameSchema>

export const EntityNameSchema = z.string().min(1).brand<'EntityName'>()
export type EntityName = z.infer<typeof EntityNameSchema>

export const ModuleNameSchema = z.string().min(1).brand<'ModuleName'>()
export type ModuleName = z.infer<typeof ModuleNameSchema>

export const ParameterTypeSchema = z.string().min(1).brand<'ParameterType'>()
export type ParameterType = z.infer<typeof ParameterTypeSchema>

export const EntityFieldTypeSchema = z.string().min(1).brand<'EntityFieldType'>()
export type EntityFieldType = z.infer<typeof EntityFieldTypeSchema>

export const ReturnTypeSchema = z.string().min(1).brand<'ReturnType'>()
export type ReturnType = z.infer<typeof ReturnTypeSchema>

export const EventNameSchema = z.string().min(1).brand<'EventName'>()
export type EventName = z.infer<typeof EventNameSchema>

export const GraphNameSchema = z.string().min(1).brand<'GraphName'>()
export type GraphName = z.infer<typeof GraphNameSchema>

export const OperationNameSchema = z.string().min(1).brand<'OperationName'>()
export type OperationName = z.infer<typeof OperationNameSchema>

export const StateNameSchema = z.string().min(1).brand<'StateName'>()
export type StateName = z.infer<typeof StateNameSchema>

export const InvariantSchema = z.string().min(1).brand<'Invariant'>()
export type Invariant = z.infer<typeof InvariantSchema>

export const EntryPointSchema = z.string().min(1).brand<'EntryPoint'>()
export type EntryPoint = z.infer<typeof EntryPointSchema>

export type NodeType = 'UI' | 'API' | 'UseCase' | 'DomainOp' | 'Event' | 'EventHandler' | 'Custom'

export type SystemType = 'domain' | 'bff' | 'ui' | 'other'

export type ApiType = 'REST' | 'GraphQL' | 'other'

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'

export type EdgeType = 'sync' | 'async'

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
  type: ParameterType
  description?: string
}

export interface OperationSignature {
  parameters?: OperationParameter[]
  returnType?: ReturnType
}

export interface OperationBehavior {
  reads?: string[]
  validates?: string[]
  modifies?: string[]
  emits?: string[]
}

export interface StateTransition {
  from: StateName
  to: StateName
  trigger?: string
}

export interface EntityField {
  name: string
  type: EntityFieldType
  required?: boolean
  description?: string
}

export interface StateMachine {
  states?: string[]
  initialState?: string
  terminalStates?: string[]
  transitions?: StateTransition[]
}

export interface EntityDataShape {
  fields?: EntityField[]
}

export interface EntityDefinition {
  description?: string
  stateMachine?: StateMachine
  invariants?: string[]
  dataShape?: EntityDataShape
}

export interface DomainMetadata {
  description: string
  systemType: SystemType
  entities?: Record<string, EntityDefinition>
}

export interface GraphMetadata {
  name?: string
  description?: string
  generated?: string
  domains: Record<string, DomainMetadata>
}

interface BaseNode {
  id: NodeId
  name: string
  domain: DomainName
  module: ModuleName
  description?: string
  sourceLocation: SourceLocation
  metadata?: Record<string, unknown>
}

export interface UINode extends BaseNode {
  type: 'UI'
  route: string
}

export interface APINode extends BaseNode {
  type: 'API'
  apiType: ApiType
  httpMethod?: HttpMethod
  path?: string
  operationName?: string
}

export interface UseCaseNode extends BaseNode {
  type: 'UseCase'
}

export interface DomainOpNode extends BaseNode {
  type: 'DomainOp'
  operationName: string
  entity?: EntityName
  signature?: OperationSignature
  behavior?: OperationBehavior
  stateChanges?: StateTransition[]
}

export interface EventNode extends BaseNode {
  type: 'Event'
  eventName: EventName
  eventSchema?: string
}

export interface EventHandlerNode extends BaseNode {
  type: 'EventHandler'
  subscribedEvents: EventName[]
}

export interface CustomNode extends BaseNode {
  type: 'Custom'
}

export type Node =
  | UINode
  | APINode
  | UseCaseNode
  | DomainOpNode
  | EventNode
  | EventHandlerNode
  | CustomNode

export interface EdgePayload {
  type?: string
  schema?: string
}

export interface Edge {
  id?: EdgeId
  source: NodeId
  target: NodeId
  type?: EdgeType
  payload?: EdgePayload
  sourceLocation?: SourceLocation
  metadata?: Record<string, unknown>
}

export interface RiviereGraph {
  version: string
  metadata: GraphMetadata
  components: Node[]
  links: Edge[]
}
