import { z } from 'zod'

const schema = z.string()

/** @riviere-role value-object */
export class DomainName {
  declare private readonly brand: 'DomainName'

  private constructor(readonly value: string) {}

  static parse(value: string): DomainName {
    return new DomainName(schema.parse(value))
  }

  localeCompare(other: DomainName): number {
    return this.value.localeCompare(other.value)
  }

  toJSON(): string {
    return this.value
  }
}
