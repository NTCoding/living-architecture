import { z } from 'zod'

const schema = z.string()

/** @riviere-role value-object */
export class EntityName {
  declare private readonly brand: 'EntityName'

  private constructor(readonly value: string) {}

  static parse(value: string): EntityName {
    return new EntityName(schema.parse(value))
  }

  toJSON(): string {
    return this.value
  }
}
