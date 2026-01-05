import {
  nodeIdSchema,
  edgeIdSchema,
  domainNameSchema,
  moduleNameSchema,
  entityNameSchema,
  eventNameSchema,
  stateNameSchema,
  parameterTypeSchema,
  returnTypeSchema,
  type Node,
  type APINode,
  type Edge,
  type NodeType,
  type ApiType,
  type HttpMethod,
  type EdgeType,
  type SourceLocation,
  type OperationSignature,
  type OperationBehavior,
  type DomainMetadata,
  type SystemType,
  type EntityDefinition,
} from '@/types/riviere'

interface RawOperationParameter {
  name: string
  type: string
  description?: string
}

export interface RawOperationSignature {
  parameters?: RawOperationParameter[]
  returnType?: string
}

export interface RawStateTransition {
  from: string
  to: string
  trigger?: string
}

export interface RawNode {
  id: string
  type: NodeType
  name: string
  domain: string
  module: string
  description?: string
  sourceLocation: SourceLocation
  metadata?: Record<string, unknown>
  route?: string
  apiType?: ApiType
  httpMethod?: HttpMethod
  path?: string
  operationName?: string
  entity?: string
  eventName?: string
  eventSchema?: string
  subscribedEvents?: string[]
  signature?: RawOperationSignature
  behavior?: OperationBehavior
  stateChanges?: RawStateTransition[]
  customTypeName?: string
}

export interface RawEdge {
  id?: string
  source: string
  target: string
  type?: EdgeType
  payload?: {
 type?: string;
schema?: string 
}
  sourceLocation?: SourceLocation
  metadata?: Record<string, unknown>
}

function parseOperationSignature(raw: RawOperationSignature): OperationSignature {
  const result: OperationSignature = {}

  if (raw.parameters !== undefined) {
    result.parameters = raw.parameters.map((p) => parseOperationParameter(p))
  }

  if (raw.returnType !== undefined) {
    result.returnType = returnTypeSchema.parse(raw.returnType)
  }

  return result
}

function parseOperationParameter(p: RawOperationParameter): {
  name: string
  type: ReturnType<typeof parameterTypeSchema.parse>
  description?: string
} {
  const param: {
 name: string;
type: ReturnType<typeof parameterTypeSchema.parse>;
description?: string 
} = {
    name: p.name,
    type: parameterTypeSchema.parse(p.type),
  }
  if (p.description !== undefined) {
    param.description = p.description
  }
  return param
}

interface BaseNodeFields {
  id: ReturnType<typeof nodeIdSchema.parse>
  name: string
  domain: ReturnType<typeof domainNameSchema.parse>
  module: ReturnType<typeof moduleNameSchema.parse>
  description?: string
  sourceLocation: SourceLocation
  metadata?: Record<string, unknown>
}

function parseBaseFields(data: RawNode): BaseNodeFields {
  const base: BaseNodeFields = {
    id: nodeIdSchema.parse(data.id),
    name: data.name,
    domain: domainNameSchema.parse(data.domain),
    module: moduleNameSchema.parse(data.module),
    sourceLocation: data.sourceLocation,
  }
  if (data.description !== undefined) base.description = data.description
  if (data.metadata !== undefined) base.metadata = data.metadata
  return base
}

function parseUINode(data: RawNode, base: BaseNodeFields): Node {
  if (data.route === undefined) {
    throw new Error(`UI node requires route: ${data.id}`)
  }
  return {
 ...base,
type: 'UI',
route: data.route 
}
}

function parseAPINode(data: RawNode, base: BaseNodeFields): Node {
  // Use 'other' as default apiType unless REST-specific properties are provided
  // This avoids requiring httpMethod/path for all API test fixtures
  const hasRestProperties = data.httpMethod !== undefined || data.path !== undefined
  const apiType = data.apiType ?? (hasRestProperties ? 'REST' : 'other')
  const node: APINode = {
 ...base,
type: 'API',
apiType 
}
  if (data.httpMethod !== undefined) node.httpMethod = data.httpMethod
  if (data.path !== undefined) node.path = data.path
  if (data.operationName !== undefined) node.operationName = data.operationName
  return node
}

function parseDomainOpNode(data: RawNode, base: BaseNodeFields): Node {
  if (data.operationName === undefined) {
    throw new Error(`DomainOp node requires operationName: ${data.id}`)
  }
  const node: Node = {
    ...base,
    type: 'DomainOp',
    operationName: data.operationName,
  }
  if (data.entity !== undefined) node.entity = entityNameSchema.parse(data.entity)
  if (data.signature !== undefined) node.signature = parseOperationSignature(data.signature)
  if (data.behavior !== undefined) node.behavior = data.behavior
  if (data.stateChanges !== undefined) {
    node.stateChanges = data.stateChanges.map(sc => ({
      from: stateNameSchema.parse(sc.from),
      to: stateNameSchema.parse(sc.to),
      ...(sc.trigger === undefined ? {} : { trigger: sc.trigger }),
    }))
  }
  return node
}

function parseEventNode(data: RawNode, base: BaseNodeFields): Node {
  if (data.eventName === undefined) {
    throw new Error(`Event node requires eventName: ${data.id}`)
  }
  const node: Node = {
    ...base,
    type: 'Event',
    eventName: eventNameSchema.parse(data.eventName),
  }
  if (data.eventSchema !== undefined) node.eventSchema = data.eventSchema
  return node
}

function parseEventHandlerNode(data: RawNode, base: BaseNodeFields): Node {
  if (data.subscribedEvents === undefined) {
    throw new Error(`EventHandler node requires subscribedEvents: ${data.id}`)
  }
  return {
    ...base,
    type: 'EventHandler',
    subscribedEvents: data.subscribedEvents.map(e => eventNameSchema.parse(e)),
  }
}

export function parseNode(data: RawNode): Node {
  const base = parseBaseFields(data)

  switch (data.type) {
    case 'UI': return parseUINode(data, base)
    case 'API': return parseAPINode(data, base)
    case 'UseCase': return {
 ...base,
type: 'UseCase' 
}
    case 'DomainOp': return parseDomainOpNode(data, base)
    case 'Event': return parseEventNode(data, base)
    case 'EventHandler': return parseEventHandlerNode(data, base)
    case 'Custom': {
      if (data.customTypeName === undefined) {
        throw new Error(`Custom node requires customTypeName: ${data.id}`)
      }
      return {
 ...base,
type: 'Custom',
customTypeName: data.customTypeName 
}
    }
  }
}

export function parseEdge(data: RawEdge): Edge {
  const id = data.id ? edgeIdSchema.parse(data.id) : undefined

  const result: Edge = {
    source: nodeIdSchema.parse(data.source),
    target: nodeIdSchema.parse(data.target),
  }

  if (id !== undefined) result.id = id
  if (data.type !== undefined) result.type = data.type
  if (data.payload !== undefined) result.payload = data.payload
  if (data.sourceLocation !== undefined) result.sourceLocation = data.sourceLocation
  if (data.metadata !== undefined) result.metadata = data.metadata

  return result
}

export function parseDomainKey(key: string): ReturnType<typeof domainNameSchema.parse> {
  return domainNameSchema.parse(key)
}


export function parseDomainMetadata(raw: Record<string, RawDomainMetadata>): Record<ReturnType<typeof domainNameSchema.parse>, DomainMetadata> {
  type ParsedDomainName = ReturnType<typeof domainNameSchema.parse>
  const result: Record<ParsedDomainName, DomainMetadata> = {}

  Object.entries(raw).forEach(([key, value]) => {
    const parsedKey: ParsedDomainName = domainNameSchema.parse(key)
    const entities: Record<ReturnType<typeof entityNameSchema.parse>, EntityDefinition> | undefined =
      value.entities
        ? Object.fromEntries(
            Object.entries(value.entities).map(([entityName, definition]) => [
              entityNameSchema.parse(entityName),
              definition,
            ]),
          )
        : undefined

    const parsedValue: DomainMetadata = {
      description: value.description,
      systemType: value.systemType,
      ...(entities === undefined ? {} : { entities }),
    }
    result[parsedKey] = parsedValue
  })

  return result
}

export interface RawDomainMetadata {
  description: string
  systemType: SystemType
  entities?: Record<string, EntityDefinition>
}

export function parseNodeId(id: string): ReturnType<typeof nodeIdSchema.parse> {
  return nodeIdSchema.parse(id)
}

