import type { EventCatalogSource } from '@living-architecture/riviere-extract-ts-domain-model/domain/ports/load-event-catalog-source'
import type { LoadAsyncApiDocument } from '@living-architecture/riviere-extract-ts-domain-model/domain/ports/load-asyncapi-document'
import type { AiCli } from '@living-architecture/riviere-extract-ts-domain-model/domain/ports/ai-cli'
import type { LoadAiExtractSources } from '@living-architecture/riviere-extract-ts-domain-model/domain/ports/load-ai-extract-sources'
import type { LoadCodeExtraction } from '@living-architecture/riviere-extract-ts-domain-model/domain/ports/load-code-extraction'
import { createCodeExtractionAdapter } from '../features/extract/adapters/ts-morph/code-extraction-adapter'
import { configureExtraction } from '../features/extract/commands/configure-extraction'
import { RiviereProjectRepository } from '../features/extract/data-access/riviere-project/riviere-project-repository'

const emptyCodeExtractionLoader: LoadCodeExtraction = createCodeExtractionAdapter()
const emptyAiExtractSourcesLoader: LoadAiExtractSources = () =>
  Promise.resolve({ files: [], missingPaths: [] })
const extractionConfiguration = configureExtraction({})

export function aiCli(
  overrides: Readonly<{ readonly checkAvailability?: AiCli['checkAvailability'] }> = {},
): AiCli {
  return {
    checkAvailability:
      overrides.checkAvailability ?? ((command) => Promise.resolve({ kind: 'available', command })),
    run: () =>
      Promise.resolve({
        kind: 'failed',
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
  injectedAiExtractSources: LoadAiExtractSources = emptyAiExtractSourcesLoader,
): RiviereProjectRepository {
  return new RiviereProjectRepository({
    aiCli: injectedAiCli,
    loadAiExtractSources: injectedAiExtractSources,
    loadEventCatalogSource,
    loadAsyncApiDocument,
    loadCodeExtraction,
    extractionBehaviour: extractionConfiguration.extractionBehaviour(),
    moduleExtractionRules: extractionConfiguration.moduleExtractionRules(),
  })
}
