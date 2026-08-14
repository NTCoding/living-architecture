import { z } from 'zod'

const schema = z.string()

/** @riviere-role value-object */
export class EventName {
  declare private readonly brand: 'EventName'

  private constructor(readonly value: string) {}

  static parse(value: string): EventName {
    return new EventName(schema.parse(value))
  }

  toJSON(): string {
    return this.value
  }
}
