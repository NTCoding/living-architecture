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
  repositoryName: string
}>

export type {
  EventCatalogDomainRecord,
  EventCatalogEventRecord,
  EventCatalogServiceRecord,
  EventCatalogSource,
  RiviereProjectCollaborators,
}
