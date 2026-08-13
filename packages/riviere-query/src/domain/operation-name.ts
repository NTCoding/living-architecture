import { z } from 'zod'

const schema = z.string()

/** @riviere-role value-object */
export class OperationName {
  declare private readonly brand: 'OperationName'

  private constructor(readonly value: string) {}

  static parse(value: string): OperationName {
    return new OperationName(schema.parse(value))
  }

  toJSON(): string {
    return this.value
  }
}
