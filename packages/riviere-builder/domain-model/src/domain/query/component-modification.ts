import type { Component } from '@living-architecture/riviere-schema-published-language/schema'
import { ComponentId } from './component-id'

/** @riviere-role value-object */
export class ComponentModification {
  declare private readonly brand: 'ComponentModification'
  readonly id: ComponentId
  readonly before: Component
  readonly after: Component
  readonly changedFields: string[]

  private constructor(input: {
    readonly id: ComponentId
    readonly before: Component
    readonly after: Component
    readonly changedFields: string[]
  }) {
    this.id = input.id
    this.before = input.before
    this.after = input.after
    this.changedFields = input.changedFields
  }

  static parse(input: {
    readonly id: ComponentId
    readonly before: Component
    readonly after: Component
    readonly changedFields: string[]
  }): ComponentModification {
    return new ComponentModification(input)
  }
}
