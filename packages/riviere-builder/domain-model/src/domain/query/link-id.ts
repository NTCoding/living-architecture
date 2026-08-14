import { z } from 'zod'

const schema = z.string()

/** @riviere-role value-object */
export class LinkId {
  declare private readonly brand: 'LinkId'

  private constructor(readonly value: string) {}

  static parse(value: string): LinkId {
    return new LinkId(schema.parse(value))
  }

  localeCompare(other: LinkId): number {
    return this.value.localeCompare(other.value)
  }

  toJSON(): string {
    return this.value
  }
}
