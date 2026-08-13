import { z } from 'zod'

const schema = z.string()

/** @riviere-role value-object */
export class State {
  declare private readonly brand: 'State'

  private constructor(readonly value: string) {}

  static parse(value: string): State {
    return new State(schema.parse(value))
  }

  toJSON(): string {
    return this.value
  }
}
