import type { LoadAsyncApiDocument } from './load-asyncapi-document'
import type { LoadCodeExtraction } from './load-code-extraction'
import type { RiviereProjectExtractionBehaviour } from './riviere-project-extraction-behaviour'
import type { RiviereModuleExtractionRules } from './riviere-module-extraction-rules'

type EventCatalogDomainRecord = Readonly<{
  id: string
  name: string
  serviceIds: readonly string[]
}>

type EventCatalogServiceRecord = Readonly<{
  id: string
  name: string
  domainId?: string | undefined
  produces: readonly string[]
  consumes: readonly string[]
}>

type EventCatalogEventRecord = Readonly<{
  id: string
  name: string
}>

type EventCatalogSource = Readonly<{
  domains: readonly EventCatalogDomainRecord[]
  services: readonly EventCatalogServiceRecord[]
  events: readonly EventCatalogEventRecord[]
}>

/**
 * @riviere-role domain-port
 * @riviere-role-justification The EventCatalog source is an external specification fact read during Workflow stage behaviour, not aggregate state created earlier in the Project lifecycle, so it is not state that the Project repository should load as part of the aggregate.
 */
export type LoadEventCatalogSource = (sourcePath: string) => Promise<EventCatalogSource>

type RiviereProjectCollaborators = Readonly<{
  loadEventCatalogSource: LoadEventCatalogSource
  loadAsyncApiDocument: LoadAsyncApiDocument
  loadCodeExtraction: LoadCodeExtraction
  repositoryName: string
  extractionBehaviour: RiviereProjectExtractionBehaviour
  moduleExtractionRules: RiviereModuleExtractionRules
}>

type RiviereProjectRepositoryCollaborators = Omit<RiviereProjectCollaborators, 'repositoryName'>

export type {
  EventCatalogDomainRecord,
  EventCatalogEventRecord,
  EventCatalogServiceRecord,
  EventCatalogSource,
  RiviereProjectCollaborators,
  RiviereProjectRepositoryCollaborators,
}
