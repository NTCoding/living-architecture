import type { EventCatalogSource } from '@living-architecture/riviere-extract-ts-domain-model/domain/ports/load-event-catalog-source'
import { RiviereProjectRepository } from '../features/extract/data-access/riviere-project/riviere-project-repository'

export function createRiviereProjectRepository(
  loadEventCatalogSource: (sourcePath: string) => Promise<EventCatalogSource> = () =>
    Promise.resolve({ domains: [], services: [], events: [] }),
): RiviereProjectRepository {
  return new RiviereProjectRepository(loadEventCatalogSource)
}
