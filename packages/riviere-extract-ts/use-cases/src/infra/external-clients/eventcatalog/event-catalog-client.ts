import eventCatalog from '@eventcatalog/sdk'
import type { EventCatalogDocument } from './event-catalog-document'

/** @riviere-role external-client-service */
export async function readEventCatalog(sourcePath: string): Promise<EventCatalogDocument> {
  const catalog = eventCatalog(sourcePath)
  const [domains, services, events] = await Promise.all([
    catalog.getDomains(),
    catalog.getServices(),
    catalog.getEvents(),
  ])
  return {
    domains: domains.map((domain) => ({
      id: domain.id,
      name: domain.name,
      serviceIds: (domain.services ?? []).map((service) => service.id),
    })),
    services: services.map((service) => ({
      id: service.id,
      name: service.name,
      produces: (service.sends ?? []).map((pointer) => pointer.id),
      consumes: (service.receives ?? []).map((pointer) => pointer.id),
    })),
    events: events.map((event) => ({ id: event.id, name: event.name })),
  }
}
