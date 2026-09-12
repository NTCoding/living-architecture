import eventCatalog from '@eventcatalog/sdk'

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

/** @riviere-role external-client-error */
export class EventCatalogUnreadableError extends Error {
  constructor(sourcePath: string) {
    super(`EventCatalog at '${sourcePath}' could not be read`)
    this.name = 'EventCatalogUnreadableError'
  }
}

/** @riviere-role external-client-service */
export async function readEventCatalog(sourcePath: string): Promise<EventCatalogDocument> {
  const catalog = eventCatalog(sourcePath)
  const [domains, services, events] = await Promise.all([
    catalog.getDomains({ latestOnly: true }),
    catalog.getServices({ latestOnly: true }),
    catalog.getEvents({ latestOnly: true }),
  ])
  return {
    domains: requireCatalogCollection(domains, sourcePath).map((domain) => ({
      id: domain.id,
      name: domain.name,
      serviceIds: (domain.services ?? []).map((service) => service.id),
    })),
    services: requireCatalogCollection(services, sourcePath).map((service) => ({
      id: service.id,
      name: service.name,
      produces: (service.sends ?? []).map((pointer) => pointer.id),
      consumes: (service.receives ?? []).map((pointer) => pointer.id),
    })),
    events: requireCatalogCollection(events, sourcePath).map((event) => ({
      id: event.id,
      name: event.name,
    })),
  }
}

function requireCatalogCollection<T>(
  collection: readonly T[] | undefined,
  sourcePath: string,
): readonly T[] {
  if (collection === undefined) throw new EventCatalogUnreadableError(sourcePath)
  return collection
}
