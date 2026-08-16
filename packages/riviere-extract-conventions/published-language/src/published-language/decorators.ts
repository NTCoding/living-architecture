/**
 * Decorators for marking architectural components.
 *
 * These decorators are pure markers with no runtime behavior.
 * They exist to be detected by the riviere-extract-ts extractor.
 */

type Method = (...args: unknown[]) => unknown

class InvalidCustomComponentTypeError extends Error {
  constructor(type: unknown) {
    super(`Custom component type must be a non-empty string, got: ${formatCustomType(type)}`)
    this.name = 'InvalidCustomComponentTypeError'
  }
}

function formatCustomType(type: unknown): string {
  if (typeof type === 'string') return `'${type}'`
  try {
    return JSON.stringify(type) ?? String(type)
  } catch {
    return '<unprintable value>'
  }
}

// ============================================================================
// Container Decorators (class-level, all public methods inherit type)
// ============================================================================

/**
 * Marks a class as a container where all public methods are domain operations.
 */
/** @riviere-role published-language-annotation */
export function DomainOpContainer<T>(target: T, _: ClassDecoratorContext): T {
  return target
}

/**
 * Marks a class as a container where all public methods are API endpoints.
 */
/** @riviere-role published-language-annotation */
export function APIContainer<T>(target: T, _: ClassDecoratorContext): T {
  return target
}

/**
 * Marks a class as a container where all public methods are event handlers.
 */
/** @riviere-role published-language-annotation */
export function EventHandlerContainer<T>(target: T, _: ClassDecoratorContext): T {
  return target
}

/**
 * Marks a class as a container where all public methods are event publishers.
 */
/** @riviere-role published-language-annotation */
export function EventPublisherContainer<T>(target: T, _: ClassDecoratorContext): T {
  return target
}

// ============================================================================
// Class-as-Component Decorators
// ============================================================================

/**
 * Marks a class as a use case component.
 */
/** @riviere-role published-language-annotation */
export function UseCase<T>(target: T, _: ClassDecoratorContext): T {
  return target
}

/**
 * Marks a class as a domain event.
 */
/** @riviere-role published-language-annotation */
export function Event<T>(target: T, _: ClassDecoratorContext): T {
  return target
}

/**
 * Marks a class as a UI component.
 */
/** @riviere-role published-language-annotation */
export function UI<T>(target: T, _: ClassDecoratorContext): T {
  return target
}

// ============================================================================
// Method-level Decorators
// ============================================================================

/**
 * Marks a method as a domain operation.
 */
/** @riviere-role published-language-annotation */
export function DomainOp<T extends Method>(target: T, _: ClassMethodDecoratorContext): T {
  return target
}

/**
 * Marks a method as an API endpoint.
 */
/** @riviere-role published-language-annotation */
export function APIEndpoint<T extends Method>(target: T, _: ClassMethodDecoratorContext): T {
  return target
}

/**
 * Marks a method as an event handler.
 */
/** @riviere-role published-language-annotation */
export function EventHandler<T extends Method>(target: T, _: ClassMethodDecoratorContext): T {
  return target
}

/**
 * Marks a class as an HTTP client for a named remote service.
 */
/** @riviere-role published-language-annotation */
export function HttpClient(
  _serviceName: string,
): <T>(target: T, context: ClassDecoratorContext) => T {
  return function <T>(target: T, _: ClassDecoratorContext): T {
    return target
  }
}

/**
 * Marks a method as an HTTP call operation.
 */
/** @riviere-role published-language-annotation */
export function HttpCall(
  _route: string,
  _method: string,
): <T extends Method>(target: T, context: ClassMethodDecoratorContext) => T {
  return function <T extends Method>(target: T, _: ClassMethodDecoratorContext): T {
    return target
  }
}

// ============================================================================
// Other Decorators
// ============================================================================

/**
 * Marks a class or method with a custom component type.
 * Use when standard component types don't fit.
 *
 * @throws InvalidCustomComponentTypeError if type is not a non-empty string
 */
/** @riviere-role published-language-annotation */
export function Custom(
  type: unknown,
): <T>(target: T, context: ClassDecoratorContext | ClassMethodDecoratorContext) => T {
  if (typeof type !== 'string' || type.trim().length === 0) {
    throw new InvalidCustomComponentTypeError(type)
  }
  return function <T>(target: T, _: ClassDecoratorContext | ClassMethodDecoratorContext): T {
    return target
  }
}

/**
 * Excludes a class or method from architectural analysis.
 * Use for infrastructure code, utilities, or code that shouldn't appear in the architecture.
 */
/** @riviere-role published-language-annotation */
export function Ignore<T>(target: T, _: ClassDecoratorContext | ClassMethodDecoratorContext): T {
  return target
}
