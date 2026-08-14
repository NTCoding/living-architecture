import { z } from 'zod'

const schema = z.string()

/** @riviere-role value-object */
export class HandlerId {
  declare private readonly brand: 'HandlerId'

  private constructor(readonly value: string) {}

  static parse(value: string): HandlerId {
    return new HandlerId(schema.parse(value))
  }

  toJSON(): string {
    return this.value
  }
}
