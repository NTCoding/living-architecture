import type { EventCatalogSource } from '@living-architecture/riviere-extract-ts-domain-model/domain/ports/load-event-catalog-source'
import type { LoadAsyncApiDocument } from '@living-architecture/riviere-extract-ts-domain-model/domain/ports/load-asyncapi-document'
import type { AiCli } from '@living-architecture/riviere-extract-ts-domain-model/domain/ports/ai-cli'
import type { LoadAiExtractSources } from '@living-architecture/riviere-extract-ts-domain-model/domain/ports/load-ai-extract-sources'
import type { ReadAiExtractSourceFiles } from '@living-architecture/riviere-extract-ts-domain-model/domain/ports/read-ai-extract-source-files'
import type { LoadCodeExtraction } from '@living-architecture/riviere-extract-ts-domain-model/domain/ports/load-code-extraction'
import { createCodeExtractionAdapter } from '../features/extract/adapters/ts-morph/code-extraction-adapter'
import { configureExtraction } from '../features/extract/commands/configure-extraction'
import { RiviereProjectRepository } from '../features/extract/data-access/riviere-project/riviere-project-repository'

const emptyCodeExtractionLoader: LoadCodeExtraction = createCodeExtractionAdapter()
const emptyAiExtractSourcesLoader: LoadAiExtractSources = () =>
  Promise.resolve({ filePaths: [], missingPaths: [] })
const emptyAiExtractSourceFilesReader: ReadAiExtractSourceFiles = (filePaths) => {
  void filePaths
  return Promise.resolve([])
}
const emptyAsyncApiDocumentLoader: LoadAsyncApiDocument = (sourcePath) => {
  void sourcePath
  return Promise.resolve({ messages: [], operations: [] })
}
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
  loadAsyncApiDocument: LoadAsyncApiDocument = emptyAsyncApiDocumentLoader,
  loadCodeExtraction: LoadCodeExtraction = emptyCodeExtractionLoader,
  injectedAiCli: AiCli = aiCli(),
  injectedAiExtractSources: LoadAiExtractSources = emptyAiExtractSourcesLoader,
  injectedAiExtractSourceFiles: ReadAiExtractSourceFiles = emptyAiExtractSourceFilesReader,
): RiviereProjectRepository {
  return new RiviereProjectRepository({
    aiCli: injectedAiCli,
    loadAiExtractSources: injectedAiExtractSources,
    readAiExtractSourceFiles: injectedAiExtractSourceFiles,
    loadEventCatalogSource,
    loadAsyncApiDocument,
    loadCodeExtraction,
    extractionBehaviour: extractionConfiguration.extractionBehaviour(),
    moduleExtractionRules: extractionConfiguration.moduleExtractionRules(),
  })
}

void emptyAiExtractSourceFilesReader([])
void emptyAsyncApiDocumentLoader('')
void aiCli().checkAvailability('claude')
