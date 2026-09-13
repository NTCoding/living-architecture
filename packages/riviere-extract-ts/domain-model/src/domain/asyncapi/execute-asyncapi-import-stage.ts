import type {
  OperationWarning,
  RiviereBuilder,
} from '@living-architecture/riviere-builder-published-language'
import type {
  AsyncApiImportConfig,
  AsyncApiMappings,
  AsyncApiOperationMapping,
} from '@living-architecture/riviere-extract-config-published-language'
import { ComponentId } from '@living-architecture/riviere-schema-published-language/component-id'
import type {
  AsyncApiDocument,
  AsyncApiMessageRecord,
  AsyncApiOperationRecord,
} from '../ports/load-asyncapi-document'
import type { RiviereProjectCollaborators } from '../ports/load-event-catalog-source'
import { WorkflowDiagnostic } from '../workflow-diagnostic'

type AsyncApiEventComponent = Readonly<{
  kind: 'event'
  id: string
  domain: string
  module: string
  name: string
}>

type AsyncApiOperationComponent = Readonly<{
  kind: 'operation'
  id: string
  mapping: AsyncApiOperationMapping
}>

type AsyncApiCanonicalComponent = AsyncApiEventComponent | AsyncApiOperationComponent

type AsyncApiCanonicalLink = Readonly<{
  from: string
  to: string
}>

type AsyncApiImportOutcome =
  | Readonly<{
      success: true
      components: readonly AsyncApiCanonicalComponent[]
      links: readonly AsyncApiCanonicalLink[]
      diagnostics: readonly WorkflowDiagnostic[]
    }>
  | Readonly<{ success: false; reason: string }>

type UnmappedRecord = Readonly<{ kind: 'message' | 'operation'; id: string }>

type ResolvedMessages = Readonly<{
  resolved: ReadonlyMap<string, AsyncApiEventComponent>
  unmapped: readonly UnmappedRecord[]
}>

type ResolvedOperations = Readonly<{
  resolved: readonly AsyncApiOperationComponent[]
  links: readonly AsyncApiCanonicalLink[]
  unmapped: readonly UnmappedRecord[]
}>

/**
 * @riviere-role domain-service
 * @riviere-role-justification Mapping and applying AsyncAPI contributions operates over a loaded external document, mapping rules, and the Builder passed in, not over private RiviereProject state, so it is not an aggregate method. It performs asynchronous I/O through a domain port and returns typed diagnostics and warnings, so it is not a value object. RiviereProject owns the decision to run the stage and supplies its Builder and collaborators.
 */
export async function executeAsyncApiImportStage(
  builder: RiviereBuilder,
  config: AsyncApiImportConfig,
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
    const document = await collaborators.loadAsyncApiDocument(config.source)
    const outcome = mapAsyncApiImport({
      document,
      mappings: config.mappings,
      allowUnmapped: config.allowUnmapped,
    })
    if (!outcome.success) {
      return { success: false, errorCode: 'ASYNCAPI_IMPORT_FAILED', reason: outcome.reason }
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
      errorCode: 'ASYNCAPI_IMPORT_FAILED',
      reason: `AsyncAPI import failed: ${String(error)}`,
    }
  }
}

function mapAsyncApiImport(input: {
  document: AsyncApiDocument
  mappings: AsyncApiMappings
  allowUnmapped: boolean
}): AsyncApiImportOutcome {
  const requestReply = findRequestReplyOperation(input.document)
  if (requestReply !== undefined) {
    return {
      success: false,
      reason: `asyncapi request/reply pattern not supported in Phase 13 (operation: '${requestReply.id}')`,
    }
  }

  const failures = findMappingConfigFailures(input)
  if (failures.length > 0) return { success: false, reason: failures.join('\n') }

  const messages = resolveMessages(input)
  const operations = resolveOperations(input, messages.resolved)
  const unmapped = [...messages.unmapped, ...operations.unmapped]
  if (!input.allowUnmapped && unmapped.length > 0) {
    return { success: false, reason: formatUnmappedReason(unmapped) }
  }

  return {
    success: true,
    components: [...messages.resolved.values(), ...operations.resolved],
    links: operations.links,
    diagnostics: unmapped.map((record) =>
      WorkflowDiagnostic.fromUnmappedRecord(record.kind, record.id),
    ),
  }
}

function findRequestReplyOperation(
  document: AsyncApiDocument,
): AsyncApiOperationRecord | undefined {
  return document.operations.find((operation) => operation.hasReply)
}

function findMappingConfigFailures(input: {
  document: AsyncApiDocument
  mappings: AsyncApiMappings
}): readonly string[] {
  const messageIds = new Set(input.document.messages.map((message) => message.id))
  const operationIds = new Set(input.document.operations.map((operation) => operation.id))
  return [
    ...unknownReferenceFailures('message', Object.keys(input.mappings.messages), messageIds),
    ...unknownReferenceFailures('operation', Object.keys(input.mappings.operations), operationIds),
  ]
}

function unknownReferenceFailures(
  recordKind: 'message' | 'operation',
  mappedIds: readonly string[],
  sourceIds: ReadonlySet<string>,
): readonly string[] {
  return mappedIds
    .filter((id) => !sourceIds.has(id))
    .map((id) => `AsyncAPI mappings reference unknown ${recordKind} '${id}'`)
}

function resolveMessages(input: {
  document: AsyncApiDocument
  mappings: AsyncApiMappings
}): ResolvedMessages {
  const resolved = new Map<string, AsyncApiEventComponent>()
  const unmapped: UnmappedRecord[] = []
  for (const message of input.document.messages) {
    const component = messageComponent(input.mappings, message)
    if (component === undefined) {
      unmapped.push({ kind: 'message', id: message.id })
      continue
    }
    resolved.set(message.id, component)
  }
  return { resolved, unmapped }
}

function messageComponent(
  mappings: AsyncApiMappings,
  message: AsyncApiMessageRecord,
): AsyncApiEventComponent | undefined {
  const mapping = mappings.messages[message.id]
  if (mapping === undefined) return undefined
  return {
    kind: 'event',
    id: ComponentId.parseFromParts({
      domain: mapping.domain,
      module: mapping.module,
      type: 'event',
      name: mapping.name,
    }).toString(),
    domain: mapping.domain,
    module: mapping.module,
    name: mapping.name,
  }
}

function resolveOperations(
  input: { document: AsyncApiDocument; mappings: AsyncApiMappings },
  messages: ReadonlyMap<string, AsyncApiEventComponent>,
): ResolvedOperations {
  const resolved: AsyncApiOperationComponent[] = []
  const links: AsyncApiCanonicalLink[] = []
  const unmapped: UnmappedRecord[] = []
  for (const operation of input.document.operations) {
    const mapping = input.mappings.operations[operation.id]
    if (mapping === undefined) {
      unmapped.push({ kind: 'operation', id: operation.id })
      continue
    }
    const component = operationComponent(mapping)
    resolved.push(component)
    links.push(...operationLinks(operation, component, messages))
  }
  return { resolved, links, unmapped }
}

function operationComponent(mapping: AsyncApiOperationMapping): AsyncApiOperationComponent {
  return {
    kind: 'operation',
    id: ComponentId.parseFromParts({
      domain: mapping.domain,
      module: mapping.module,
      type: mapping.type.toLowerCase(),
      name: mapping.name,
    }).toString(),
    mapping,
  }
}

function operationLinks(
  operation: AsyncApiOperationRecord,
  component: AsyncApiOperationComponent,
  messages: ReadonlyMap<string, AsyncApiEventComponent>,
): readonly AsyncApiCanonicalLink[] {
  return operation.messageIds.flatMap((messageId) => {
    const message = messages.get(messageId)
    if (message === undefined) return []
    return operation.action === 'send'
      ? [{ from: component.id, to: message.id }]
      : [{ from: message.id, to: component.id }]
  })
}

function formatUnmappedReason(unmapped: readonly UnmappedRecord[]): string {
  return `Unmapped AsyncAPI records: ${unmapped
    .map((record) => `${record.kind} '${record.id}'`)
    .join(', ')}`
}

function applyComponents(
  builder: RiviereBuilder,
  components: readonly AsyncApiCanonicalComponent[],
  config: AsyncApiImportConfig,
  repositoryName: string,
): OperationWarning[] {
  const warnings: OperationWarning[] = []
  for (const component of components) {
    warnings.push(...upsertComponent(builder, component, config, repositoryName).warnings)
  }
  return warnings
}

function upsertComponent(
  builder: RiviereBuilder,
  component: AsyncApiCanonicalComponent,
  config: AsyncApiImportConfig,
  repositoryName: string,
) {
  const common = {
    name: component.kind === 'event' ? component.name : component.mapping.name,
    domain: component.kind === 'event' ? component.domain : component.mapping.domain,
    module: component.kind === 'event' ? component.module : component.mapping.module,
    sourceLocation: { repository: repositoryName, filePath: config.sourceFilePath },
  }
  if (component.kind === 'event') {
    return builder.upsertEvent({ ...common, eventName: component.name })
  }
  const mapping = component.mapping
  switch (mapping.type) {
    case 'API':
      return builder.upsertApi({ ...common, apiType: 'other' })
    case 'UseCase':
      return builder.upsertUseCase(common)
    case 'DomainOp':
      return builder.upsertDomainOp({ ...common, operationName: mapping.name })
    case 'Event':
      return builder.upsertEvent({ ...common, eventName: mapping.name })
    case 'EventHandler':
      return builder.upsertEventHandler({ ...common, subscribedEvents: [] })
  }
}

function applyLinks(builder: RiviereBuilder, links: readonly AsyncApiCanonicalLink[]): void {
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

export type { AsyncApiCanonicalComponent, AsyncApiCanonicalLink }
