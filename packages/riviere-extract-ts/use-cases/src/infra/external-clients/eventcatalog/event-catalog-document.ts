/** @riviere-role external-client-model */
export interface EventCatalogDomainDocument {
  readonly id: string
  readonly name: string
  readonly serviceIds: readonly string[]
}

/** @riviere-role external-client-model */
export interface EventCatalogServiceDocument {
  readonly id: string
  readonly name: string
  readonly produces: readonly string[]
  readonly consumes: readonly string[]
}

/** @riviere-role external-client-model */
export interface EventCatalogEventDocument {
  readonly id: string
  readonly name: string
}

/** @riviere-role external-client-model */
export interface EventCatalogDocument {
  readonly domains: readonly EventCatalogDomainDocument[]
  readonly services: readonly EventCatalogServiceDocument[]
  readonly events: readonly EventCatalogEventDocument[]
}
