import { z } from 'zod'

const schema = z.string()

/** @riviere-role value-object */
export class HandlerName {
  declare private readonly brand: 'HandlerName'

  private constructor(readonly value: string) {}

  static parse(value: string): HandlerName {
    return new HandlerName(schema.parse(value))
  }

  toJSON(): string {
    return this.value
  }
}
