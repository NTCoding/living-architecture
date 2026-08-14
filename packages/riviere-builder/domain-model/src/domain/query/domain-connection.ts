import { DomainName } from './domain-name'

/** @riviere-role value-object */
export class DomainConnection {
  declare private readonly brand: 'DomainConnection'
  readonly targetDomain: DomainName
  readonly direction: 'outgoing' | 'incoming'
  readonly apiCount: number
  readonly eventCount: number

  private constructor(input: {
    readonly targetDomain: DomainName
    readonly direction: 'outgoing' | 'incoming'
    readonly apiCount: number
    readonly eventCount: number
  }) {
    this.targetDomain = input.targetDomain
    this.direction = input.direction
    this.apiCount = input.apiCount
    this.eventCount = input.eventCount
  }

  static parse(input: {
    readonly targetDomain: DomainName
    readonly direction: 'outgoing' | 'incoming'
    readonly apiCount: number
    readonly eventCount: number
  }): DomainConnection {
    return new DomainConnection(input)
  }
}
