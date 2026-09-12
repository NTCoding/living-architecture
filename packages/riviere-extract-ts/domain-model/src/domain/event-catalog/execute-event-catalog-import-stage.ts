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
  | Readonly<{
      kind: 'event-handler'
      id: string
      domain: string
      module: string
      name: string
      subscribedEvents: readonly string[]
    }>

type EventCatalogCanonicalLink = Readonly<{
  from: string
  to: string
}>

type EventCatalogUseCaseComponent = Extract<EventCatalogCanonicalComponent, { kind: 'use-case' }>

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
  component: EventCatalogUseCaseComponent
  produces: readonly string[]
  consumes: readonly string[]
}>

type ResolvedServices = Readonly<{
  resolved: ReadonlyMap<string, ResolvedService>
  unmapped: readonly UnmappedRecord[]
}>

type ResolvedEvents = Readonly<{
  resolved: ReadonlyMap<string, EventCatalogCanonicalComponent>
  unmapped: readonly UnmappedRecord[]
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
  try {
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
  } catch (error) {
    return {
      success: false,
      errorCode: 'EVENT_CATALOG_IMPORT_FAILED',
      reason: `EventCatalog import failed: ${String(error)}`,
    }
  }
}

function mapEventCatalogImport(input: {
  source: EventCatalogSource
  mappings: EventCatalogMappings
  allowUnmapped: boolean
}): EventCatalogImportOutcome {
  const services = resolveServices(input)
  const events = resolveEvents(input, services.resolved)
  const handlers = buildConsumedEventHandlers(services.resolved, events.resolved)
  const failures = findMappingConfigFailures(input)
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
      ...handlers.components,
    ],
    links: [...buildLinks(services.resolved, events.resolved), ...handlers.links],
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
  const sourceDomainIds = new Set(input.source.domains.map((domain) => domain.id))
  return [
    ...Object.keys(input.mappings.domains)
      .filter((id) => !sourceDomainIds.has(id))
      .map((id) => `EventCatalog mappings reference unknown domain '${id}'`),
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
  for (const service of input.source.services) {
    const mapping = input.mappings.services[service.id]
    const defaultDomain = canonicalDomain(input, service) ?? service.domainId
    const domain = mapping?.domain ?? defaultDomain
    if (domain === undefined) {
      unmapped.push({ kind: 'service', id: service.id })
      continue
    }
    const module = mapping?.module ?? kebabCase(service.name)
    const name = mapping?.name ?? service.name
    const type = (mapping?.type ?? 'UseCase').toLowerCase()
    const componentId = ComponentId.parseFromParts({
      domain,
      module,
      type,
      name,
    }).toString()
    resolved.set(service.id, {
      component: {
        kind: 'use-case',
        id: componentId,
        domain,
        module,
        name,
      },
      produces: service.produces,
      consumes: service.consumes,
    })
  }
  return { resolved, unmapped }
}

function kebabCase(value: string): string {
  const withBoundaries = value.replaceAll(/([a-z0-9])([A-Z])/g, '$1-$2')
  return withBoundaries
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((part) => part.length > 0)
    .join('-')
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
  for (const event of input.source.events) {
    const component = resolveEventComponent(input, services, event)
    if (component === undefined) {
      unmapped.push({ kind: 'event', id: event.id })
      continue
    }
    resolved.set(event.id, component)
  }
  return { resolved, unmapped }
}

function resolveEventComponent(
  input: { source: EventCatalogSource; mappings: EventCatalogMappings },
  services: ReadonlyMap<string, ResolvedService>,
  event: { id: string; name: string },
): EventCatalogCanonicalComponent | undefined {
  const mapping = input.mappings.events[event.id]
  const producer = producerComponentFor(input, services, event.id)
  const domain = mapping?.domain ?? producer?.domain
  const module = mapping?.module ?? producer?.module
  if (domain === undefined || module === undefined) return undefined
  const name = mapping?.name ?? event.name
  return {
    kind: 'event',
    id: ComponentId.parseFromParts({
      domain,
      module,
      type: 'event',
      name,
    }).toString(),
    domain,
    module,
    name,
    eventName: name,
  }
}

function producerComponentFor(
  input: { source: EventCatalogSource },
  services: ReadonlyMap<string, ResolvedService>,
  eventId: string,
): EventCatalogCanonicalComponent | undefined {
  const producer = producersOf(input.source.services, eventId).find((service) =>
    services.has(service.id),
  )
  if (producer === undefined) return undefined
  return services.get(producer.id)?.component
}

function producersOf(
  services: readonly EventCatalogServiceRecord[],
  eventId: string,
): readonly EventCatalogServiceRecord[] {
  return services.filter((service) => service.produces.includes(eventId))
}

function buildConsumedEventHandlers(
  services: ReadonlyMap<string, ResolvedService>,
  events: ReadonlyMap<string, EventCatalogCanonicalComponent>,
): {
  components: readonly EventCatalogCanonicalComponent[]
  links: readonly EventCatalogCanonicalLink[]
} {
  const components: EventCatalogCanonicalComponent[] = []
  const links: EventCatalogCanonicalLink[] = []
  for (const service of services.values()) {
    const consumed = service.consumes.flatMap((eventId) => {
      const event = events.get(eventId)
      return event === undefined ? [] : [event]
    })
    if (consumed.length === 0) continue
    const handler: EventCatalogCanonicalComponent = {
      kind: 'event-handler',
      id: ComponentId.parseFromParts({
        domain: service.component.domain,
        module: service.component.module,
        type: 'eventhandler',
        name: service.component.name,
      }).toString(),
      domain: service.component.domain,
      module: service.component.module,
      name: service.component.name,
      subscribedEvents: consumed.map((event) => event.name),
    }
    components.push(handler)
    for (const event of consumed) links.push({ from: event.id, to: handler.id })
  }
  return { components, links }
}

function buildLinks(
  services: ReadonlyMap<string, ResolvedService>,
  events: ReadonlyMap<string, EventCatalogCanonicalComponent>,
): readonly EventCatalogCanonicalLink[] {
  const links = new Map<string, EventCatalogCanonicalLink>()
  for (const service of services.values()) {
    for (const produced of service.produces) {
      const event = events.get(produced)
      if (event !== undefined) addLink(links, service.component.id, event.id)
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
  const sourceLocation = { repository: repositoryName, filePath: config.sourceFilePath }
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
    case 'event-handler':
      return builder.upsertEventHandler({
        name: component.name,
        domain: component.domain,
        module: component.module,
        subscribedEvents: [...component.subscribedEvents],
        sourceLocation,
      })
  }
}

function applyLinks(builder: RiviereBuilder, links: readonly EventCatalogCanonicalLink[]): void {
  const existing = new Set(builder.links().map((link) => linkKey(link.source, link.target)))
  for (const link of links) {
    const key = linkKey(link.from, link.to)
    if (existing.has(key)) continue
    builder.link({ from: link.from, to: link.to, type: 'async' })
    existing.add(key)
  }
}

function linkKey(source: string, target: string): string {
  return `${source}->${target}`
}
