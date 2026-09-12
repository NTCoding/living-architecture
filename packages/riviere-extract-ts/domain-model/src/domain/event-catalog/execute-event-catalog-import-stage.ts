import type {
  OperationWarning,
  RiviereBuilder,
} from '@living-architecture/riviere-builder-published-language'
import type {
  EventCatalogImportConfig,
  EventCatalogMappings,
} from '@living-architecture/riviere-extract-config-published-language'
import { ComponentId } from '@living-architecture/riviere-schema-published-language/component-id'
import type {
  EventCatalogServiceRecord,
  EventCatalogSource,
  RiviereProjectCollaborators,
} from '../ports/load-event-catalog-source'
import { WorkflowDiagnostic } from '../workflow-diagnostic'

type EventCatalogCanonicalComponent =
  | Readonly<{
      kind: 'use-case'
      id: string
      domain: string
      module: string
      name: string
    }>
  | Readonly<{
      kind: 'event'
      id: string
      domain: string
      module: string
      name: string
      eventName: string
    }>

type EventCatalogCanonicalLink = Readonly<{
  from: string
  to: string
}>

type EventCatalogImportOutcome =
  | Readonly<{
      success: true
      components: readonly EventCatalogCanonicalComponent[]
      links: readonly EventCatalogCanonicalLink[]
      diagnostics: readonly WorkflowDiagnostic[]
    }>
  | Readonly<{ success: false; reason: string }>

type UnmappedRecord = Readonly<{ kind: 'service' | 'event'; id: string }>

type ResolvedService = Readonly<{
  component: EventCatalogCanonicalComponent
  produces: readonly string[]
  consumes: readonly string[]
}>

type ResolvedServices = Readonly<{
  resolved: ReadonlyMap<string, ResolvedService>
  unmapped: readonly UnmappedRecord[]
  failures: readonly string[]
}>

type ResolvedEvents = Readonly<{
  resolved: ReadonlyMap<string, EventCatalogCanonicalComponent>
  unmapped: readonly UnmappedRecord[]
  failures: readonly string[]
}>

/**
 * @riviere-role domain-service
 * @riviere-role-justification Mapping and applying EventCatalog contributions operates over loaded external facts, mapping rules, and the Builder passed in, not over private RiviereProject state, so it is not an aggregate method. It performs asynchronous I/O through a domain port and returns typed diagnostics and warnings, so it is not a value object. RiviereProject owns the decision to run the stage and supplies its Builder and collaborators.
 */
export async function executeEventCatalogImportStage(
  builder: RiviereBuilder,
  config: EventCatalogImportConfig,
  collaborators: RiviereProjectCollaborators,
): Promise<
  | Readonly<{
      success: true
      diagnostics: readonly WorkflowDiagnostic[]
      warnings: readonly OperationWarning[]
    }>
  | Readonly<{ success: false; errorCode: string; reason: string }>
> {
  const source = await collaborators.loadEventCatalogSource(config.source)
  const outcome = mapEventCatalogImport({
    source,
    mappings: config.mappings,
    allowUnmapped: config.allowUnmapped,
  })
  if (!outcome.success) {
    return { success: false, errorCode: 'EVENT_CATALOG_IMPORT_FAILED', reason: outcome.reason }
  }
  const warnings = applyComponents(
    builder,
    outcome.components,
    config,
    collaborators.repositoryName,
  )
  applyLinks(builder, outcome.links)
  return { success: true, diagnostics: outcome.diagnostics, warnings }
}

function mapEventCatalogImport(input: {
  source: EventCatalogSource
  mappings: EventCatalogMappings
  allowUnmapped: boolean
}): EventCatalogImportOutcome {
  const services = resolveServices(input)
  const events = resolveEvents(input, services.resolved)
  const failures = [...findMappingConfigFailures(input), ...services.failures, ...events.failures]
  if (failures.length > 0) return { success: false, reason: failures.join('\n') }

  const unmapped = [...services.unmapped, ...events.unmapped]
  if (!input.allowUnmapped && unmapped.length > 0) {
    return { success: false, reason: formatUnmappedReason(unmapped) }
  }

  return {
    success: true,
    components: [
      ...[...services.resolved.values()].map((service) => service.component),
      ...events.resolved.values(),
    ],
    links: buildLinks(services.resolved, events.resolved),
    diagnostics: unmapped.map((record) =>
      WorkflowDiagnostic.fromUnmappedRecord(record.kind, record.id),
    ),
  }
}

function findMappingConfigFailures(input: {
  source: EventCatalogSource
  mappings: EventCatalogMappings
}): readonly string[] {
  const sourceServiceIds = new Set(input.source.services.map((service) => service.id))
  const sourceEventIds = new Set(input.source.events.map((event) => event.id))
  return [
    ...Object.keys(input.mappings.services)
      .filter((id) => !sourceServiceIds.has(id))
      .map((id) => `EventCatalog mappings reference unknown service '${id}'`),
    ...Object.keys(input.mappings.events)
      .filter((id) => !sourceEventIds.has(id))
      .map((id) => `EventCatalog mappings reference unknown event '${id}'`),
  ]
}

function resolveServices(input: {
  source: EventCatalogSource
  mappings: EventCatalogMappings
}): ResolvedServices {
  const resolved = new Map<string, ResolvedService>()
  const unmapped: UnmappedRecord[] = []
  const failures: string[] = []
  for (const service of input.source.services) {
    const mapping = input.mappings.services[service.id]
    if (mapping === undefined) {
      unmapped.push({ kind: 'service', id: service.id })
      continue
    }
    const domain = mapping.domain ?? canonicalDomain(input, service)
    if (domain === undefined) {
      failures.push(
        `EventCatalog service '${service.id}' has no canonical domain; add a domain to its mapping`,
      )
      continue
    }
    resolved.set(service.id, {
      component: {
        kind: 'use-case',
        id: ComponentId.parseFromParts({
          domain,
          module: mapping.module,
          type: 'usecase',
          name: mapping.name,
        }).toString(),
        domain,
        module: mapping.module,
        name: mapping.name,
      },
      produces: service.produces,
      consumes: service.consumes,
    })
  }
  return { resolved, unmapped, failures }
}

function canonicalDomain(
  input: { mappings: EventCatalogMappings },
  service: EventCatalogServiceRecord,
): string | undefined {
  if (service.domainId === undefined) return undefined
  return input.mappings.domains[service.domainId]
}

function resolveEvents(
  input: { source: EventCatalogSource; mappings: EventCatalogMappings },
  services: ReadonlyMap<string, ResolvedService>,
): ResolvedEvents {
  const resolved = new Map<string, EventCatalogCanonicalComponent>()
  const unmapped: UnmappedRecord[] = []
  const failures: string[] = []
  for (const event of input.source.events) {
    const mapping = input.mappings.events[event.id]
    if (mapping === undefined) {
      unmapped.push({ kind: 'event', id: event.id })
      continue
    }
    const producer = producersOf(input.source.services, event.id).find((service) =>
      services.has(service.id),
    )
    const producerComponent =
      producer === undefined ? undefined : services.get(producer.id)?.component
    const domain = mapping.domain ?? producerComponent?.domain
    const module = mapping.module ?? producerComponent?.module
    if (domain === undefined || module === undefined) {
      failures.push(
        `EventCatalog event '${event.id}' has no canonical domain and module; add them to its mapping or map a producing service`,
      )
      continue
    }
    resolved.set(event.id, {
      kind: 'event',
      id: ComponentId.parseFromParts({
        domain,
        module,
        type: 'event',
        name: mapping.name,
      }).toString(),
      domain,
      module,
      name: mapping.name,
      eventName: mapping.name,
    })
  }
  return { resolved, unmapped, failures }
}

function producersOf(
  services: readonly EventCatalogServiceRecord[],
  eventId: string,
): readonly EventCatalogServiceRecord[] {
  return services.filter((service) => service.produces.includes(eventId))
}

function buildLinks(
  services: ReadonlyMap<string, ResolvedService>,
  events: ReadonlyMap<string, EventCatalogCanonicalComponent>,
): readonly EventCatalogCanonicalLink[] {
  const links = new Map<string, EventCatalogCanonicalLink>()
  for (const service of services.values()) {
    const serviceComponentId = service.component.id
    for (const produced of service.produces) {
      const event = events.get(produced)
      if (event !== undefined) addLink(links, serviceComponentId, event.id)
    }
    for (const consumed of service.consumes) {
      const event = events.get(consumed)
      if (event !== undefined) addLink(links, event.id, serviceComponentId)
    }
  }
  return [...links.values()]
}

function addLink(links: Map<string, EventCatalogCanonicalLink>, from: string, to: string): void {
  links.set(`${from}->${to}`, { from, to })
}

function formatUnmappedReason(unmapped: readonly UnmappedRecord[]): string {
  return `Unmapped EventCatalog records: ${unmapped
    .map((record) => `${record.kind} '${record.id}'`)
    .join(', ')}`
}

function applyComponents(
  builder: RiviereBuilder,
  components: readonly EventCatalogCanonicalComponent[],
  config: EventCatalogImportConfig,
  repositoryName: string,
): OperationWarning[] {
  const warnings: OperationWarning[] = []
  for (const component of components) {
    const upserted = upsertComponent(builder, component, config, repositoryName)
    warnings.push(...upserted.warnings)
  }
  return warnings
}

function upsertComponent(
  builder: RiviereBuilder,
  component: EventCatalogCanonicalComponent,
  config: EventCatalogImportConfig,
  repositoryName: string,
) {
  const sourceLocation = { repository: repositoryName, filePath: config.source }
  switch (component.kind) {
    case 'use-case':
      return builder.upsertUseCase({
        name: component.name,
        domain: component.domain,
        module: component.module,
        sourceLocation,
      })
    case 'event':
      return builder.upsertEvent({
        name: component.name,
        domain: component.domain,
        module: component.module,
        eventName: component.eventName,
        sourceLocation,
      })
  }
}

function applyLinks(builder: RiviereBuilder, links: readonly EventCatalogCanonicalLink[]): void {
  const existing = new Set(
    builder.links().map((link) => linkKey(link.source, link.target, link.type)),
  )
  for (const link of links) {
    const key = linkKey(link.from, link.to, 'async')
    if (existing.has(key)) continue
    builder.link({ from: link.from, to: link.to, type: 'async' })
    existing.add(key)
  }
}

function linkKey(source: string, target: string, type: string | undefined): string {
  return type === undefined ? `${source}->${target}` : `${source}->${target}|${type}`
}
