/**
 * HTTP methods supported for API controllers.
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

/**
 * Interface for API controller classes.
 * Classes implementing this interface represent HTTP endpoint handlers.
 *
 * Required properties:
 * - route: The URL path for this endpoint
 * - method: The HTTP method (GET, POST, PUT, PATCH, DELETE)
 */
export interface APIControllerDef {
  readonly route: string
  readonly method: HttpMethod
}

/**
 * Interface for domain event classes.
 * Classes implementing this interface represent events that have occurred in the domain.
 *
 * Required properties:
 * - type: A unique identifier for this event type (should be a string literal)
 */
export interface EventDef {readonly type: string}

/**
 * Interface for event handler classes.
 * Classes implementing this interface subscribe to and process domain events.
 *
 * Required properties:
 * - subscribedEvents: Array of event type names this handler processes
 */
export interface EventHandlerDef {readonly subscribedEvents: readonly string[]}

/**
 * Generic event handler interface for use with fromGenericArg extraction.
 * Classes implement this with a concrete event type to enable automatic
 * subscribedEvents extraction from the generic argument.
 *
 * Example: class MyHandler implements IEventHandler<OrderPlaced> { ... }
 * The extractor reads OrderPlaced from the generic arg as the subscribed event.
 */
export interface IEventHandler<TEvent = unknown> {
  readonly subscribedEvents: readonly string[]
  readonly __eventType?: TEvent
}

/**
 * Interface for UI page classes.
 * Classes implementing this interface represent routable UI pages.
 *
 * Required properties:
 * - route: The URL path for this page
 */
export interface UIPageDef {readonly route: string}

/**
 * Marker interface for domain operation container classes.
 * Classes implementing this interface contain domain operations as methods.
 * No required properties - the class itself serves as the container.
 */
export interface DomainOpContainerDef {readonly __brand?: 'DomainOpContainerDef'}
