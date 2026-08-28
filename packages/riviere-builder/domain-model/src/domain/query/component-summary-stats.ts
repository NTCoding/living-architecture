import type { RiviereGraph } from '@living-architecture/riviere-schema-published-language/schema'

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

  static fromGraph(graph: RiviereGraph): ComponentSummaryStats {
    const components = graph.components
    return ComponentSummaryStats.parse({
      componentCount: components.length,
      componentsByType: {
        UI: components.filter((component) => component.type === 'UI').length,
        API: components.filter((component) => component.type === 'API').length,
        UseCase: components.filter((component) => component.type === 'UseCase').length,
        DomainOp: components.filter((component) => component.type === 'DomainOp').length,
        Event: components.filter((component) => component.type === 'Event').length,
        EventHandler: components.filter((component) => component.type === 'EventHandler').length,
        Custom: components.filter((component) => component.type === 'Custom').length,
      },
      linkCount: graph.links.length,
      externalLinkCount: graph.externalLinks?.length ?? 0,
      domainCount: Object.keys(graph.metadata.domains).length,
    })
  }
}
