import type { detectEventPublisherConnections } from '../connection-detection/async-detection/detect-event-publisher-connections'
import type { detectSubscribeConnections } from '../connection-detection/async-detection/detect-subscribe-connections'
import type { detectConnectionsFromCalls } from '../connection-detection/call-graph/detect-connections-from-calls'
import type {
  resolveHttpLinks,
  stripResolvedCustomTypes,
} from '../connection-detection/resolve-http-links'
import type { applyCodeExtractionToBuilder } from '../code-extraction/apply-code-extraction-to-builder'
import type { detectCodeExtractionConnections } from '../code-extraction/detect-code-extraction-connections'
import type { extractCodeExtraction } from '../code-extraction/extract-code-extraction'
import type { executeAsyncApiImportStage } from '../asyncapi/execute-asyncapi-import-stage'
import type { executeEventCatalogImportStage } from '../event-catalog/execute-event-catalog-import-stage'

type RiviereProjectExtractionBehaviour = Readonly<{
  readonly extractCodeExtraction: typeof extractCodeExtraction
  readonly detectCodeExtractionConnections: typeof detectCodeExtractionConnections
  readonly applyCodeExtractionToBuilder: typeof applyCodeExtractionToBuilder
  readonly stripResolvedCustomTypes: typeof stripResolvedCustomTypes
  readonly executeEventCatalogImportStage: typeof executeEventCatalogImportStage
  readonly executeAsyncApiImportStage: typeof executeAsyncApiImportStage
  readonly detectConnectionsFromCalls: typeof detectConnectionsFromCalls
  readonly detectEventPublisherConnections: typeof detectEventPublisherConnections
  readonly detectSubscribeConnections: typeof detectSubscribeConnections
  readonly resolveHttpLinks: typeof resolveHttpLinks
}>

export type { RiviereProjectExtractionBehaviour }
