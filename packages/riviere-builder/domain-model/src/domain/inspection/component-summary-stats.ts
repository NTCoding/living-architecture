/** @riviere-role value-object */
export class ComponentSummaryStats {
  declare private readonly brand: 'ComponentSummaryStats'
  readonly componentCount: number
  readonly componentsByType: {
    readonly UI: number
    readonly API: number
    readonly UseCase: number
    readonly DomainOp: number
    readonly Event: number
    readonly EventHandler: number
    readonly Custom: number
  }
  readonly linkCount: number
  readonly externalLinkCount: number
  readonly domainCount: number

  private constructor(input: {
    readonly componentCount: number
    readonly componentsByType: {
      readonly UI: number
      readonly API: number
      readonly UseCase: number
      readonly DomainOp: number
      readonly Event: number
      readonly EventHandler: number
      readonly Custom: number
    }
    readonly linkCount: number
    readonly externalLinkCount: number
    readonly domainCount: number
  }) {
    this.componentCount = input.componentCount
    this.componentsByType = Object.freeze({ ...input.componentsByType })
    this.linkCount = input.linkCount
    this.externalLinkCount = input.externalLinkCount
    this.domainCount = input.domainCount
  }

  static parse(input: {
    readonly componentCount: number
    readonly componentsByType: {
      readonly UI: number
      readonly API: number
      readonly UseCase: number
      readonly DomainOp: number
      readonly Event: number
      readonly EventHandler: number
      readonly Custom: number
    }
    readonly linkCount: number
    readonly externalLinkCount: number
    readonly domainCount: number
  }): ComponentSummaryStats {
    return new ComponentSummaryStats(input)
  }
}
