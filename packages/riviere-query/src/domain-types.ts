import type { Component, Link } from '@living-architecture/riviere-schema'
import { z } from 'zod'

const componentIdSchema = z.string().brand<'ComponentId'>()
const linkIdSchema = z.string().brand<'LinkId'>()
const entityNameSchema = z.string().brand<'EntityName'>()
const domainNameSchema = z.string().brand<'DomainName'>()
const stateSchema = z.string().brand<'State'>()
const operationNameSchema = z.string().brand<'OperationName'>()
const eventIdSchema = z.string().brand<'EventId'>()
const eventNameSchema = z.string().brand<'EventName'>()
const handlerIdSchema = z.string().brand<'HandlerId'>()
const handlerNameSchema = z.string().brand<'HandlerName'>()

export type ComponentId = z.infer<typeof componentIdSchema>
export type LinkId = z.infer<typeof linkIdSchema>
export type EntityName = z.infer<typeof entityNameSchema>
export type DomainName = z.infer<typeof domainNameSchema>
export type State = z.infer<typeof stateSchema>
export type OperationName = z.infer<typeof operationNameSchema>
export type EventId = z.infer<typeof eventIdSchema>
export type EventName = z.infer<typeof eventNameSchema>
export type HandlerId = z.infer<typeof handlerIdSchema>
export type HandlerName = z.infer<typeof handlerNameSchema>

export type ValidationErrorCode = 'INVALID_LINK_SOURCE' | 'INVALID_LINK_TARGET' | 'INVALID_TYPE'

export interface ValidationError {
  path: string
  message: string
  code: ValidationErrorCode
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

export interface ComponentCounts {
  UI: number
  API: number
  UseCase: number
  DomainOp: number
  Event: number
  EventHandler: number
  Custom: number
  total: number
}

export interface Domain {
  name: string
  description: string
  systemType: 'domain' | 'bff' | 'ui' | 'other'
  componentCounts: ComponentCounts
}

export interface ComponentModification {
  id: ComponentId
  before: Component
  after: Component
  changedFields: string[]
}

export interface DiffStats {
  componentsAdded: number
  componentsRemoved: number
  componentsModified: number
  linksAdded: number
  linksRemoved: number
}

export interface GraphDiff {
  components: {
    added: Component[]
    removed: Component[]
    modified: ComponentModification[]
  }
  links: {
    added: Link[]
    removed: Link[]
  }
  stats: DiffStats
}

export type LinkType = 'sync' | 'async'

export interface FlowStep {
  component: Component
  linkType: LinkType | undefined
  depth: number
}

export interface Flow {
  entryPoint: Component
  steps: FlowStep[]
}

export interface SearchWithFlowResult {
  matchingIds: ComponentId[]
  visibleIds: ComponentId[]
}

export interface CrossDomainLink {
  targetDomain: DomainName
  linkType: LinkType | undefined
}

export interface DomainConnection {
  targetDomain: DomainName
  direction: 'outgoing' | 'incoming'
  apiCount: number
  eventCount: number
}

export interface GraphStats {
  componentCount: number
  linkCount: number
  domainCount: number
  apiCount: number
  entityCount: number
  eventCount: number
}

export function parseComponentId(id: string): ComponentId {
  return componentIdSchema.parse(id)
}

export function parseLinkId(id: string): LinkId {
  return linkIdSchema.parse(id)
}

export function parseEntityName(value: string): EntityName {
  return entityNameSchema.parse(value)
}

export function parseDomainName(value: string): DomainName {
  return domainNameSchema.parse(value)
}

export function parseState(value: string): State {
  return stateSchema.parse(value)
}

export function parseOperationName(value: string): OperationName {
  return operationNameSchema.parse(value)
}

export function parseEventId(value: string): EventId {
  return eventIdSchema.parse(value)
}

export function parseEventName(value: string): EventName {
  return eventNameSchema.parse(value)
}

export function parseHandlerId(value: string): HandlerId {
  return handlerIdSchema.parse(value)
}

export function parseHandlerName(value: string): HandlerName {
  return handlerNameSchema.parse(value)
}
