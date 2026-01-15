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
 * - handle: The request handler function
 */
export interface APIControllerDef {
  readonly route: string
  readonly method: HttpMethod
  handle(req: Request, res: Response): void | Promise<void>
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
 * - handle: The event processing function
 */
export interface EventHandlerDef {
  readonly subscribedEvents: readonly string[]
  handle(event: unknown): void | Promise<void>
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
