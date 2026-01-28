import { z } from 'zod'
import type {
  ComponentType,
  LinkType,
  Link,
  Component,
  APIComponent,
} from '@living-architecture/riviere-schema'

export type NodeType = ComponentType | 'External'

export type EdgeType = LinkType

export type Edge = Link

export type Node = Component

export type APINode = APIComponent

export interface EntityDefinition {
  description?: string
  properties?: Record<string, string>
}

export const nodeIdSchema = z.string().min(1).brand<'NodeId'>()
export type NodeId = z.infer<typeof nodeIdSchema>

export const edgeIdSchema = z.string().min(1).brand<'EdgeId'>()

export const domainNameSchema = z.string().min(1).brand<'DomainName'>()
export type DomainName = z.infer<typeof domainNameSchema>

export const entityNameSchema = z.string().min(1).brand<'EntityName'>()

export const moduleNameSchema = z.string().min(1).brand<'ModuleName'>()

export const parameterTypeSchema = z.string().min(1).brand<'ParameterType'>()

export const returnTypeSchema = z.string().min(1).brand<'ReturnType'>()

export const eventNameSchema = z.string().min(1).brand<'EventName'>()

export const graphNameSchema = z.string().min(1).brand<'GraphName'>()
export type GraphName = z.infer<typeof graphNameSchema>

export const operationNameSchema = z.string().min(1).brand<'OperationName'>()
export type OperationName = z.infer<typeof operationNameSchema>

export const stateNameSchema = z.string().min(1).brand<'StateName'>()

export const entryPointSchema = z.string().min(1).brand<'EntryPoint'>()
export type EntryPoint = z.infer<typeof entryPointSchema>
