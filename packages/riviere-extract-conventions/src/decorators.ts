/**
 * Decorators for marking architectural components.
 *
 * These decorators are pure markers with no runtime behavior.
 * They exist to be detected by the riviere-extract-ts extractor.
 */

type Method = (...args: unknown[]) => unknown

// ============================================================================
// Container Decorators (class-level, all public methods inherit type)
// ============================================================================

/**
 * Marks a class as a container where all public methods are domain operations.
 */
export function DomainOpContainer<T>(target: T, _: ClassDecoratorContext): T {
  return target
}

/**
 * Marks a class as a container where all public methods are API endpoints.
 */
export function APIContainer<T>(target: T, _: ClassDecoratorContext): T {
  return target
}

/**
 * Marks a class as a container where all public methods are event handlers.
 */
export function EventHandlerContainer<T>(target: T, _: ClassDecoratorContext): T {
  return target
}

// ============================================================================
// Class-as-Component Decorators
// ============================================================================

/**
 * Marks a class as a use case component.
 */
export function UseCase<T>(target: T, _: ClassDecoratorContext): T {
  return target
}

/**
 * Marks a class as a domain event.
 */
export function Event<T>(target: T, _: ClassDecoratorContext): T {
  return target
}

/**
 * Marks a class as a UI component.
 */
export function UI<T>(target: T, _: ClassDecoratorContext): T {
  return target
}

// ============================================================================
// Method-level Decorators
// ============================================================================

/**
 * Marks a method as a domain operation.
 */
export function DomainOp<T extends Method>(target: T, _: ClassMethodDecoratorContext): T {
  return target
}

/**
 * Marks a method as an API endpoint.
 */
export function APIEndpoint<T extends Method>(target: T, _: ClassMethodDecoratorContext): T {
  return target
}

/**
 * Marks a method as an event handler.
 */
export function EventHandler<T extends Method>(target: T, _: ClassMethodDecoratorContext): T {
  return target
}

// ============================================================================
// Other Decorators
// ============================================================================

// Symbol for storing custom types on decorated targets
const CUSTOM_TYPE_SYMBOL = Symbol.for('@living-architecture/riviere-extract-conventions.customType')

/**
 * Marks a class or method with a custom component type.
 * Use when standard component types don't fit.
 *
 * @throws TypeError if type is empty or whitespace-only
 */
export function Custom(
  type: string,
): <T>(target: T, context: ClassDecoratorContext | ClassMethodDecoratorContext) => T {
  const trimmed = type.trim()
  if (trimmed.length === 0) {
    throw new TypeError('Custom component type cannot be empty or whitespace-only')
  }
  return function <T>(target: T, _: ClassDecoratorContext | ClassMethodDecoratorContext): T {
    try {
      Object.defineProperty(target, CUSTOM_TYPE_SYMBOL, {
        value: trimmed,
        configurable: true,
      })
    } catch {
      // Ignore errors when setting property on non-objects
    }
    return target
  }
}

/**
 * Excludes a class or method from architectural analysis.
 * Use for infrastructure code, utilities, or code that shouldn't appear in the architecture.
 */
export function Ignore<T>(target: T, _: ClassDecoratorContext | ClassMethodDecoratorContext): T {
  return target
}

/**
 * Gets the custom type for a decorated target.
 * Used by the extractor to read custom component types.
 */
export function getCustomType(target: unknown): string | undefined {
  if (target == null) return undefined
  if (typeof target !== 'object' && typeof target !== 'function') return undefined
  const descriptor = Object.getOwnPropertyDescriptor(target, CUSTOM_TYPE_SYMBOL)
  if (descriptor && typeof descriptor.value === 'string') {
    return descriptor.value
  }
  return undefined
}
