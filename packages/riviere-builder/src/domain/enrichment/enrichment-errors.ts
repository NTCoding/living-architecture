export class InvalidEnrichmentTargetError extends Error {
  readonly componentId: string
  readonly componentType: string

  constructor(componentId: string, componentType: string) {
    super(`Only DomainOp components can be enriched. '${componentId}' is type '${componentType}'`)
    this.name = 'InvalidEnrichmentTargetError'
    this.componentId = componentId
    this.componentType = componentType
  }
}
