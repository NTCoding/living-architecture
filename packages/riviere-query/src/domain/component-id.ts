import { z } from 'zod'

const schema = z.string()

/** @riviere-role value-object */
export class ComponentId {
  declare private readonly brand: 'ComponentId'

  private constructor(readonly value: string) {}

  static parse(value: string): ComponentId {
    return new ComponentId(schema.parse(value))
  }

  localeCompare(other: ComponentId): number {
    return this.value.localeCompare(other.value)
  }

  toJSON(): string {
    return this.value
  }
}
