import { z } from 'zod';

export const nodeIdSchema = z.string().min(1).brand<'NodeId'>();
export type NodeId = z.infer<typeof nodeIdSchema>;

export const edgeIdSchema = z.string().min(1).brand<'EdgeId'>();
export type EdgeId = z.infer<typeof edgeIdSchema>;

export const domainNameSchema = z.string().min(1).brand<'DomainName'>();
export type DomainName = z.infer<typeof domainNameSchema>;

export const entityNameSchema = z.string().min(1).brand<'EntityName'>();
type EntityName = z.infer<typeof entityNameSchema>;

export const moduleNameSchema = z.string().min(1).brand<'ModuleName'>();
type ModuleName = z.infer<typeof moduleNameSchema>;

export const parameterTypeSchema = z.string().min(1).brand<'ParameterType'>();
type ParameterType = z.infer<typeof parameterTypeSchema>;

export const returnTypeSchema = z.string().min(1).brand<'ReturnType'>();
export type ReturnType = z.infer<typeof returnTypeSchema>;

export const eventNameSchema = z.string().min(1).brand<'EventName'>();
type EventName = z.infer<typeof eventNameSchema>;

export const graphNameSchema = z.string().min(1).brand<'GraphName'>();
export type GraphName = z.infer<typeof graphNameSchema>;

export const operationNameSchema = z.string().min(1).brand<'OperationName'>();
export type OperationName = z.infer<typeof operationNameSchema>;

export const stateNameSchema = z.string().min(1).brand<'StateName'>();
type StateName = z.infer<typeof stateNameSchema>;

export const entryPointSchema = z.string().min(1).brand<'EntryPoint'>();
export type EntryPoint = z.infer<typeof entryPointSchema>;

export type NodeType =
  | 'UI'
  | 'API'
  | 'UseCase'
  | 'DomainOp'
  | 'Event'
  | 'EventHandler'
  | 'Custom'
  | 'External';

export type SystemType = 'domain' | 'bff' | 'ui' | 'other';

export type ApiType = 'REST' | 'GraphQL' | 'other';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export type EdgeType = 'sync' | 'async';

export interface SourceLocation {
  repository: string;
  filePath: string;
  lineNumber?: number;
  endLineNumber?: number;
  methodName?: string;
  url?: string;
}

export interface OperationParameter {
  name: string;
  type: ParameterType;
  description?: string;
}

export interface OperationSignature {
  parameters?: OperationParameter[];
  returnType?: ReturnType;
}

export interface OperationBehavior {
  reads?: string[];
  validates?: string[];
  modifies?: string[];
  emits?: string[];
}

interface StateTransition {
  from: StateName;
  to: StateName;
  trigger?: string;
}

export interface DomainMetadata {
  description: string;
  systemType: SystemType;
}

export interface GraphMetadata {
  name?: string;
  description?: string;
  generated?: string;
  domains: Record<string, DomainMetadata>;
}

interface BaseNode {
  id: NodeId;
  name: string;
  domain: DomainName;
  module: ModuleName;
  description?: string;
  sourceLocation: SourceLocation;
  metadata?: Record<string, unknown>;
}

interface UINode extends BaseNode {
  type: 'UI';
  route: string;
}

export interface APINode extends BaseNode {
  type: 'API';
  apiType: ApiType;
  httpMethod?: HttpMethod;
  path?: string;
  operationName?: string;
}

interface UseCaseNode extends BaseNode {type: 'UseCase';}

interface DomainOpNode extends BaseNode {
  type: 'DomainOp';
  operationName: string;
  entity?: EntityName;
  signature?: OperationSignature;
  behavior?: OperationBehavior;
  stateChanges?: StateTransition[];
}

interface EventNode extends BaseNode {
  type: 'Event';
  eventName: EventName;
  eventSchema?: string;
}

interface EventHandlerNode extends BaseNode {
  type: 'EventHandler';
  subscribedEvents: EventName[];
}

interface CustomNode extends BaseNode {
  type: 'Custom';
  customTypeName: string;
}

export type Node =
  | UINode
  | APINode
  | UseCaseNode
  | DomainOpNode
  | EventNode
  | EventHandlerNode
  | CustomNode;

export interface EdgePayload {
  type?: string;
  schema?: string;
}

export interface Edge {
  id?: EdgeId;
  source: NodeId;
  target: NodeId;
  type?: EdgeType;
  payload?: EdgePayload;
  sourceLocation?: SourceLocation;
  metadata?: Record<string, unknown>;
}

export interface ExternalTarget {
  name: string;
  domain?: string;
  repository?: string;
  url?: string;
}

export type LinkType = 'sync' | 'async';

export interface ExternalLink {
  id?: string;
  source: NodeId;
  target: ExternalTarget;
  type?: LinkType;
  description?: string;
  sourceLocation?: SourceLocation;
  metadata?: Record<string, unknown>;
}

export interface RiviereGraph {
  version: string;
  metadata: GraphMetadata;
  components: Node[];
  links: Edge[];
  externalLinks?: ExternalLink[];
}
