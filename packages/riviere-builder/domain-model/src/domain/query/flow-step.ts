import type {
  Component,
  ExternalLink,
  Link,
} from '@living-architecture/riviere-schema-published-language/schema'

/** @riviere-role value-object */
export class FlowStep {
  declare private readonly brand: 'FlowStep'
  readonly component: Component
  readonly outgoingLinks: Link[]
  readonly depth: number
  readonly externalLinks: ExternalLink[]

  private constructor(input: {
    readonly component: Component
    readonly outgoingLinks: Link[]
    readonly depth: number
    readonly externalLinks: ExternalLink[]
  }) {
    this.component = input.component
    this.outgoingLinks = input.outgoingLinks
    this.depth = input.depth
    this.externalLinks = input.externalLinks
  }

  static parse(input: {
    readonly component: Component
    readonly outgoingLinks: Link[]
    readonly depth: number
    readonly externalLinks: ExternalLink[]
  }): FlowStep {
    return new FlowStep(input)
  }
}
