import type { EventCatalogSource } from '@living-architecture/riviere-extract-ts-domain-model/domain/ports/load-event-catalog-source'
import type { LoadAsyncApiDocument } from '@living-architecture/riviere-extract-ts-domain-model/domain/ports/load-asyncapi-document'
import type { LoadCodeExtraction } from '@living-architecture/riviere-extract-ts-domain-model/domain/ports/load-code-extraction'
import { createCodeExtractionAdapter } from '../features/extract/adapters/ts-morph/code-extraction-adapter'
import { RiviereProjectRepository } from '../features/extract/data-access/riviere-project/riviere-project-repository'

const emptyCodeExtractionLoader: LoadCodeExtraction = createCodeExtractionAdapter()

export function createRiviereProjectRepository(
  loadEventCatalogSource: (sourcePath: string) => Promise<EventCatalogSource> = () =>
    Promise.resolve({ domains: [], services: [], events: [] }),
  loadAsyncApiDocument: LoadAsyncApiDocument = () =>
    Promise.resolve({ messages: [], operations: [] }),
  loadCodeExtraction: LoadCodeExtraction = emptyCodeExtractionLoader,
): RiviereProjectRepository {
  return new RiviereProjectRepository(
    loadEventCatalogSource,
    loadAsyncApiDocument,
    loadCodeExtraction,
  )
}
