import type { EventCatalogSource } from '@living-architecture/riviere-extract-ts-domain-model/domain/ports/load-event-catalog-source'
import type { LoadAsyncApiDocument } from '@living-architecture/riviere-extract-ts-domain-model/domain/ports/load-asyncapi-document'
import type { AiCli } from '@living-architecture/riviere-extract-ts-domain-model/domain/ports/ai-cli'
import type { LoadCodeExtraction } from '@living-architecture/riviere-extract-ts-domain-model/domain/ports/load-code-extraction'
import { createCodeExtractionAdapter } from '../features/extract/adapters/ts-morph/code-extraction-adapter'
import { configureExtraction } from '../features/extract/commands/configure-extraction'
import { RiviereProjectRepository } from '../features/extract/data-access/riviere-project/riviere-project-repository'

const emptyCodeExtractionLoader: LoadCodeExtraction = createCodeExtractionAdapter()
const extractionConfiguration = configureExtraction({})

export function aiCli(): AiCli {
  return {
    checkAvailability: (command) => Promise.resolve({ kind: 'available', command }),
    run: () =>
      Promise.resolve({
        kind: 'invalid-arguments',
        reason: 'The repository fixture does not invoke AI CLI execution',
      }),
  }
}

export function createRiviereProjectRepository(
  loadEventCatalogSource: (sourcePath: string) => Promise<EventCatalogSource> = () =>
    Promise.resolve({ domains: [], services: [], events: [] }),
  loadAsyncApiDocument: LoadAsyncApiDocument = () =>
    Promise.resolve({ messages: [], operations: [] }),
  loadCodeExtraction: LoadCodeExtraction = emptyCodeExtractionLoader,
  injectedAiCli: AiCli = aiCli(),
): RiviereProjectRepository {
  return new RiviereProjectRepository({
    aiCli: injectedAiCli,
    loadEventCatalogSource,
    loadAsyncApiDocument,
    loadCodeExtraction,
    extractionBehaviour: extractionConfiguration.extractionBehaviour(),
    moduleExtractionRules: extractionConfiguration.moduleExtractionRules(),
  })
}
