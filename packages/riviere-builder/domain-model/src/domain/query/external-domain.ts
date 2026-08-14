import { DomainName } from './domain-name'

/** @riviere-role value-object */
export class ExternalDomain {
  declare private readonly brand: 'ExternalDomain'
  readonly name: string
  readonly sourceDomains: DomainName[]
  readonly connectionCount: number

  private constructor(input: {
    readonly name: string
    readonly sourceDomains: DomainName[]
    readonly connectionCount: number
  }) {
    this.name = input.name
    this.sourceDomains = input.sourceDomains
    this.connectionCount = input.connectionCount
  }

  static parse(input: {
    readonly name: string
    readonly sourceDomains: DomainName[]
    readonly connectionCount: number
  }): ExternalDomain {
    return new ExternalDomain(input)
  }
}
