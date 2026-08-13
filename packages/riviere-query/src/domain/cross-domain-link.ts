import { DomainName } from './domain-name'

type CrossDomainLinkType = 'sync' | 'async' | undefined

/** @riviere-role value-object */
export class CrossDomainLink {
  declare private readonly brand: 'CrossDomainLink'
  readonly targetDomain: DomainName
  readonly linkType: CrossDomainLinkType

  private constructor(input: {
    readonly targetDomain: DomainName
    readonly linkType: CrossDomainLinkType
  }) {
    this.targetDomain = input.targetDomain
    this.linkType = input.linkType
  }

  static parse(input: {
    readonly targetDomain: DomainName
    readonly linkType: CrossDomainLinkType
  }): CrossDomainLink {
    return new CrossDomainLink(input)
  }
}
