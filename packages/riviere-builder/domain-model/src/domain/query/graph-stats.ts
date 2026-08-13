/** @riviere-role value-object */
export class GraphStats {
  declare private readonly brand: 'GraphStats'
  readonly componentCount: number
  readonly linkCount: number
  readonly domainCount: number
  readonly apiCount: number
  readonly entityCount: number
  readonly eventCount: number

  private constructor(input: {
    readonly componentCount: number
    readonly linkCount: number
    readonly domainCount: number
    readonly apiCount: number
    readonly entityCount: number
    readonly eventCount: number
  }) {
    this.componentCount = input.componentCount
    this.linkCount = input.linkCount
    this.domainCount = input.domainCount
    this.apiCount = input.apiCount
    this.entityCount = input.entityCount
    this.eventCount = input.eventCount
  }

  static parse(input: {
    readonly componentCount: number
    readonly linkCount: number
    readonly domainCount: number
    readonly apiCount: number
    readonly entityCount: number
    readonly eventCount: number
  }): GraphStats {
    return new GraphStats(input)
  }
}
