/**
 * Parts that make up a component ID.
 */
export interface ComponentIdParts {
  domain: string
  module: string
  type: string
  name: string
}

/**
 * Error thrown when parsing an invalid component ID string.
 */
export class InvalidComponentIdError extends Error {
  constructor(public readonly invalidId: string) {
    super(`Invalid component ID format: '${invalidId}'. Expected 'domain:module:type:name'`)
    this.name = 'InvalidComponentIdError'
  }
}

/**
 * Represents a structured component identifier.
 *
 * Component IDs follow the format `{domain}:{module}:{type}:{name}` in kebab-case.
 *
 * @example
 * ```typescript
 * const id = ComponentId.create({
 *   domain: 'orders',
 *   module: 'checkout',
 *   type: 'api',
 *   name: 'Create Order'
 * })
 * id.toString() // 'orders:checkout:api:create-order'
 * ```
 */
export class ComponentId {
  private readonly _name: string
  private readonly value: string

  private constructor(name: string, value: string) {
    this._name = name
    this.value = value
  }

  /**
   * Creates a ComponentId from individual parts.
   *
   * @param parts - Domain, module, type, and name segments
   * @returns A new ComponentId instance
   *
   * @example
   * ```typescript
   * const id = ComponentId.create({
   *   domain: 'orders',
   *   module: 'checkout',
   *   type: 'api',
   *   name: 'Create Order'
   * })
   * ```
   */
  static create(parts: ComponentIdParts): ComponentId {
    const nameSegment = parts.name.toLowerCase().replaceAll(/\s+/g, '-')
    const value = `${parts.domain}:${parts.module}:${parts.type}:${nameSegment}`
    return new ComponentId(nameSegment, value)
  }

  /**
   * Parses a string ID into a ComponentId instance.
   *
   * @param id - String in format `domain:module:type:name`
   * @returns A ComponentId instance
   * @throws If the format is invalid
   *
   * @example
   * ```typescript
   * const id = ComponentId.parse('orders:checkout:api:create-order')
   * id.name() // 'create-order'
   * ```
   */
  static parse(id: string): ComponentId {
    const parts = id.split(':')
    const name = parts[3]
    if (parts.length !== 4 || name === undefined) {
      throw new InvalidComponentIdError(id)
    }
    return new ComponentId(name, id)
  }

  /**
   * Returns the full component ID string.
   *
   * @returns Full ID in format `domain:module:type:name`
   */
  toString(): string {
    return this.value
  }

  /**
   * Returns the name segment of the component ID.
   *
   * @returns The kebab-case name portion
   */
  name(): string {
    return this._name
  }
}
