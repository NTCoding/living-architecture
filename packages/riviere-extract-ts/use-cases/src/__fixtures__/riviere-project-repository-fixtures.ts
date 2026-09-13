import type { EventCatalogSource } from '@living-architecture/riviere-extract-ts-domain-model/domain/ports/load-event-catalog-source'
import type { LoadAsyncApiDocument } from '@living-architecture/riviere-extract-ts-domain-model/domain/ports/load-asyncapi-document'
import { RiviereProjectRepository } from '../features/extract/data-access/riviere-project/riviere-project-repository'

export function createRiviereProjectRepository(
  loadEventCatalogSource: (sourcePath: string) => Promise<EventCatalogSource> = () =>
    Promise.resolve({ domains: [], services: [], events: [] }),
  loadAsyncApiDocument: LoadAsyncApiDocument = () =>
    Promise.resolve({ messages: [], operations: [] }),
): RiviereProjectRepository {
  return new RiviereProjectRepository(loadEventCatalogSource, loadAsyncApiDocument)
}
