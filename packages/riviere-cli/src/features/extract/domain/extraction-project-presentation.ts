import { ComponentId } from '@living-architecture/riviere-schema'
import type * as RiviereSchema from '@living-architecture/riviere-schema'
import type {
  EnrichedComponent, ExtractedLink 
} from '@living-architecture/riviere-extract-ts'

type PresentedMetadataValue = string | number | boolean | string[]

/** @riviere-role domain-service */
export function toPresentedComponent(
  component: RiviereSchema.Component,
  missingFields: readonly {
    componentId: string
    field: string
  }[],
  outcomeComponentsById: ReadonlyMap<string, EnrichedComponent>,
): EnrichedComponent {
  const originalComponent = outcomeComponentsById.get(component.id)
  const presentedComponent: EnrichedComponent = {
    type: toExtractComponentType(component.type),
    name: component.name,
    domain: component.domain,
    module: component.module,
    location: {
      file: component.sourceLocation.filePath,
      line: component.sourceLocation.lineNumber ?? 1,
    },
    metadata: originalComponent?.metadata ?? toPresentedMetadata(component),
  }

  const componentMissingFields = missingFields
    .filter((entry) => entry.componentId === component.id)
    .map((entry) => entry.field)

  return componentMissingFields.length === 0
    ? presentedComponent
    : withMissingFields(presentedComponent, componentMissingFields)
}

/** @riviere-role domain-service */
export function toPresentedLink(
  link: RiviereSchema.Link,
  uncertainLinks: readonly {
    source: string
    target: string
    linkType: string
    reason: string
  }[],
): ExtractedLink {
  const matchingDiagnostic = uncertainLinks.find(
    (entry) =>
      entry.source === link.source &&
      entry.target === link.target &&
      entry.linkType === (link.type ?? 'sync'),
  )
  const baseLink = toPresentedBaseLink(link)

  return matchingDiagnostic === undefined
    ? baseLink
    : withUncertainReason(baseLink, matchingDiagnostic.reason)
}

/** @riviere-role domain-service */
export function toOutcomeComponentId(component: EnrichedComponent): string {
  return ComponentId.create({
    domain: component.domain,
    module: component.module,
    type: toSchemaComponentType(component.type),
    name: component.name,
  }).toString()
}

function toExtractComponentType(type: RiviereSchema.ComponentType): string {
  if (type === 'UseCase') {
    return 'useCase'
  }
  if (type === 'DomainOp') {
    return 'domainOp'
  }
  if (type === 'EventHandler') {
    return 'eventHandler'
  }
  return type.charAt(0).toLowerCase() + type.slice(1)
}

function toPresentedMetadata(
  component: RiviereSchema.Component,
): Record<string, PresentedMetadataValue> {
  if (component.type === 'UI') {
    return { route: component.route }
  }
  if (component.type === 'API') {
    return toApiMetadata(component)
  }
  if (component.type === 'DomainOp') {
    return toDomainOpMetadata(component)
  }
  if (component.type === 'Event') {
    return toEventMetadata(component)
  }
  if (component.type === 'EventHandler') {
    return { subscribedEvents: component.subscribedEvents }
  }
  if (component.type === 'Custom') {
    return toCustomMetadata(component)
  }
  return {}
}

function toPresentedBaseLink(link: RiviereSchema.Link): ExtractedLink {
  return {
    source: link.source,
    target: link.target,
    ...(link.type === undefined ? {} : { type: link.type }),
    ...(link.sourceLocation === undefined ? {} : { sourceLocation: link.sourceLocation }),
  }
}

function toApiMetadata(
  component: Extract<RiviereSchema.Component, { type: 'API' }>,
): Record<string, PresentedMetadataValue> {
  return {
    apiType: component.apiType,
    ...(component.httpMethod === undefined ? {} : { httpMethod: component.httpMethod }),
    ...(component.path === undefined ? {} : { path: component.path }),
    ...(component.operationName === undefined ? {} : { operationName: component.operationName }),
  }
}

function toDomainOpMetadata(
  component: Extract<RiviereSchema.Component, { type: 'DomainOp' }>,
): Record<string, PresentedMetadataValue> {
  return {
    operationName: component.operationName,
    ...(component.entity === undefined ? {} : { entity: component.entity }),
    ...(component.businessRules === undefined ? {} : { businessRules: component.businessRules }),
  }
}

function toEventMetadata(
  component: Extract<RiviereSchema.Component, { type: 'Event' }>,
): Record<string, PresentedMetadataValue> {
  return {
    eventName: component.eventName,
    ...(component.eventSchema === undefined ? {} : { eventSchema: component.eventSchema }),
  }
}

function toCustomMetadata(
  component: Extract<RiviereSchema.Component, { type: 'Custom' }>,
): Record<string, PresentedMetadataValue> {
  const metadata: Record<string, PresentedMetadataValue> = {}

  for (const [key, value] of Object.entries(component)) {
    if (isExcludedCustomMetadataKey(key)) {
      continue
    }

    if (isSupportedMetadataValue(value)) {
      metadata[key] = value
    }
  }

  return metadata
}

function isExcludedCustomMetadataKey(key: string): boolean {
  return [
    'id',
    'type',
    'name',
    'domain',
    'module',
    'description',
    'sourceLocation',
    'customTypeName',
  ].includes(key)
}

function isSupportedMetadataValue(value: unknown): value is PresentedMetadataValue {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    (Array.isArray(value) && value.every((item) => typeof item === 'string'))
  )
}

function withUncertainReason(link: ExtractedLink, reason: string): ExtractedLink {
  return {
    ...link,
    _uncertain: reason,
  }
}

function withMissingFields(
  component: EnrichedComponent,
  missingFields: string[],
): EnrichedComponent {
  return {
    ...component,
    _missing: missingFields,
  }
}

function toSchemaComponentType(type: string): string {
  if (type === 'useCase') {
    return 'usecase'
  }
  if (type === 'domainOp') {
    return 'domainop'
  }
  if (type === 'eventHandler') {
    return 'eventhandler'
  }
  return type
}
