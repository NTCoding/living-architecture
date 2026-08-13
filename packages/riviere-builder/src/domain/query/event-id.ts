import { z } from 'zod'

const schema = z.string()

/** @riviere-role value-object */
export class EventId {
  declare private readonly brand: 'EventId'

  private constructor(readonly value: string) {}

  static parse(value: string): EventId {
    return new EventId(schema.parse(value))
  }

  toJSON(): string {
    return this.value
  }
}
