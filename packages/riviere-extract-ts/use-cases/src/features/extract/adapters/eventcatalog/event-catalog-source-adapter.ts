import type {
  EventCatalogSource,
  LoadEventCatalogSource,
} from '@living-architecture/riviere-extract-ts-domain-model/domain/ports/load-event-catalog-source'
import { readEventCatalog } from '../../../../infra/external-clients/eventcatalog/event-catalog-client'

/** @riviere-role domain-port-adapter */
export function createEventCatalogSourceAdapter(): LoadEventCatalogSource {
  return async (sourcePath) => toEventCatalogSource(await readEventCatalog(sourcePath))
}

function toEventCatalogSource(
  document: Awaited<ReturnType<typeof readEventCatalog>>,
): EventCatalogSource {
  const domainByServiceId = new Map<string, string>()
  for (const domain of document.domains) {
    for (const serviceId of domain.serviceIds) domainByServiceId.set(serviceId, domain.id)
  }
  return {
    domains: document.domains.map((domain) => ({
      id: domain.id,
      name: domain.name,
      serviceIds: [...domain.serviceIds],
    })),
    services: document.services.map((service) => {
      const domainId = domainByServiceId.get(service.id)
      return {
        id: service.id,
        name: service.name,
        ...(domainId === undefined ? {} : { domainId }),
        produces: [...service.produces],
        consumes: [...service.consumes],
      }
    }),
    events: document.events.map((event) => ({ id: event.id, name: event.name })),
  }
}
