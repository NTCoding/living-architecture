/**
 * Decorators for marking architectural components.
 *
 * These decorators are pure markers with no runtime behavior.
 * They exist to be detected by the riviere-extract-ts extractor.
 */

type Constructor = new (...args: unknown[]) => object
type Method = (...args: unknown[]) => unknown

// ============================================================================
// Container Decorators (class-level, all public methods inherit type)
// ============================================================================

/**
 * Marks a class as a container where all public methods are domain operations.
 */
export function DomainOpContainer<T extends Constructor>(target: T, _: ClassDecoratorContext): T {
  return target
}

/**
 * Marks a class as a container where all public methods are API endpoints.
 */
export function APIContainer<T extends Constructor>(target: T, _: ClassDecoratorContext): T {
  return target
}

/**
 * Marks a class as a container where all public methods are event handlers.
 */
export function EventHandlerContainer<T extends Constructor>(
  target: T,
  _: ClassDecoratorContext,
): T {
  return target
}

// ============================================================================
// Class-as-Component Decorators
// ============================================================================

/**
 * Marks a class as a use case component.
 */
export function UseCase<T extends Constructor>(target: T, _: ClassDecoratorContext): T {
  return target
}

/**
 * Marks a class as a domain event.
 */
export function Event<T extends Constructor>(target: T, _: ClassDecoratorContext): T {
  return target
}

/**
 * Marks a class as a UI component.
 */
export function UI<T extends Constructor>(target: T, _: ClassDecoratorContext): T {
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

// WeakMap to store custom types for extraction
const customTypes = new WeakMap<Constructor | Method, string>()

/**
 * Marks a class or method with a custom component type.
 * Use when standard component types don't fit.
 */
export function Custom(
  type: string,
): <T extends Constructor | Method>(
  target: T,
  context: ClassDecoratorContext | ClassMethodDecoratorContext,
) => T {
  return function <T extends Constructor | Method>(
    target: T,
    _: ClassDecoratorContext | ClassMethodDecoratorContext,
  ): T {
    customTypes.set(target, type)
    return target
  }
}

/**
 * Excludes a class or method from architectural analysis.
 * Use for infrastructure code, utilities, or code that shouldn't appear in the architecture.
 */
export function Ignore<T extends Constructor | Method>(
  target: T,
  _: ClassDecoratorContext | ClassMethodDecoratorContext,
): T {
  return target
}

/**
 * Gets the custom type for a decorated target.
 * Used by the extractor to read custom component types.
 */
export function getCustomType(target: Constructor | Method): string | undefined {
  return customTypes.get(target)
}
