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

/** @riviere-role value-object */
export type ComponentId = z.infer<typeof componentIdSchema>
/** @riviere-role value-object */
export type LinkId = z.infer<typeof linkIdSchema>
/** @riviere-role value-object */
export type EntityName = z.infer<typeof entityNameSchema>
/** @riviere-role value-object */
export type DomainName = z.infer<typeof domainNameSchema>
/** @riviere-role value-object */
export type State = z.infer<typeof stateSchema>
/** @riviere-role value-object */
export type OperationName = z.infer<typeof operationNameSchema>
/** @riviere-role value-object */
export type EventId = z.infer<typeof eventIdSchema>
/** @riviere-role value-object */
export type EventName = z.infer<typeof eventNameSchema>
/** @riviere-role value-object */
export type HandlerId = z.infer<typeof handlerIdSchema>
/** @riviere-role value-object */
export type HandlerName = z.infer<typeof handlerNameSchema>

/** @riviere-role domain-service */
export function parseComponentId(id: string): ComponentId {
  return componentIdSchema.parse(id)
}

/** @riviere-role domain-service */
export function parseLinkId(id: string): LinkId {
  return linkIdSchema.parse(id)
}

/** @riviere-role domain-service */
export function parseEntityName(value: string): EntityName {
  return entityNameSchema.parse(value)
}

/** @riviere-role domain-service */
export function parseDomainName(value: string): DomainName {
  return domainNameSchema.parse(value)
}

/** @riviere-role domain-service */
export function parseState(value: string): State {
  return stateSchema.parse(value)
}

/** @riviere-role domain-service */
export function parseOperationName(value: string): OperationName {
  return operationNameSchema.parse(value)
}

/** @riviere-role domain-service */
export function parseEventId(value: string): EventId {
  return eventIdSchema.parse(value)
}

/** @riviere-role domain-service */
export function parseEventName(value: string): EventName {
  return eventNameSchema.parse(value)
}

/** @riviere-role domain-service */
export function parseHandlerId(value: string): HandlerId {
  return handlerIdSchema.parse(value)
}

/** @riviere-role domain-service */
export function parseHandlerName(value: string): HandlerName {
  return handlerNameSchema.parse(value)
}
