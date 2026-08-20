import type { GraphBuilder } from '@living-architecture/riviere-extract-ts-domain-model/domain/ports/graph-builder'

type EnrichedComponent = Parameters<GraphBuilder['addComponents']>[1][number]
type ExtractedLink = Parameters<GraphBuilder['addLinks']>[0][number]
type ExternalLink = Parameters<GraphBuilder['addLinks']>[1][number]
type MetadataValue = EnrichedComponent['metadata'][string]

class InvalidRiviereBuilderInputError extends Error {}

interface RiviereBuilderOperations {
  upsertApi(input: unknown): unknown
  upsertCustom(input: unknown): unknown
  upsertDomainOp(input: unknown): unknown
  upsertEvent(input: unknown): unknown
  upsertEventHandler(input: unknown): unknown
  upsertUI(input: unknown): unknown
  upsertUseCase(input: unknown): unknown
  link(input: unknown): unknown
  linkExternal(input: unknown): unknown
  validate(): unknown
  build(): ReturnType<GraphBuilder['build']>
}

interface GraphOptions {
  readonly domains: Readonly<
    Record<
      string,
      { readonly description: string; readonly systemType: 'domain' | 'bff' | 'ui' | 'external-service' | 'other' }
    >
  >
  readonly sources: readonly { readonly repository: string }[]
}

interface RiviereBuilderOperationsFactory {
  create(input: GraphOptions): RiviereBuilderOperations
}

/** @riviere-role domain-port-adapter */
export class RiviereBuilderGraph implements GraphBuilder {
  constructor(private readonly builder: RiviereBuilderOperations) {}

  addComponents(repository: string, components: readonly EnrichedComponent[]): void {
    for (const component of components) addComponent(this.builder, repository, component)
  }

  addLinks(links: readonly ExtractedLink[], externalLinks: readonly ExternalLink[]): void {
    for (const link of links) {
      this.builder.link({
        from: link.source,
        to: link.target,
        type: link.type,
        sourceLocation: link.sourceLocation,
      })
    }
    for (const externalLink of externalLinks) {
      this.builder.linkExternal({
        from: externalLink.source,
        target: externalLink.target,
        type: externalLink.type,
        description: externalLink.description,
        sourceLocation: externalLink.sourceLocation,
      })
    }
  }

  validate(): void {
    this.builder.validate()
  }

  build(): ReturnType<GraphBuilder['build']> {
    return this.builder.build()
  }
}

/** @riviere-role domain-port-adapter */
export function createRiviereBuilderGraph(factory: RiviereBuilderOperationsFactory) {
  return ({ domains, sources }: GraphOptions): GraphBuilder =>
    new RiviereBuilderGraph(factory.create({ domains, sources }))
}

function addComponent(
  builder: RiviereBuilderOperations,
  repository: string,
  component: EnrichedComponent,
): void {
  const input = {
    domain: component.domain,
    metadata: component.metadata,
    module: component.module,
    name: component.name,
    sourceLocation: {
      filePath: component.location.file,
      lineNumber: component.location.line,
      repository,
    },
  }
  if (component.type === 'api') {
    const httpMethod = optionalHttpMethod(component.metadata['method'])
    const operationName = optionalString(component.metadata['operationName'])
    const path = optionalString(component.metadata['route'])
    builder.upsertApi({
      ...input,
      apiType: requiredApiType(component.metadata['apiType']),
      ...(httpMethod === undefined ? {} : { httpMethod }),
      ...(operationName === undefined ? {} : { operationName }),
      ...(path === undefined ? {} : { path }),
    })
    return
  }
  if (component.type === 'useCase') {
    builder.upsertUseCase(input)
    return
  }
  if (component.type === 'domainOp') {
    builder.upsertDomainOp({
      ...input,
      operationName: requiredString(component.metadata['operationName'], 'operationName'),
    })
    return
  }
  if (component.type === 'event') {
    const eventSchema = optionalString(component.metadata['eventSchema'])
    builder.upsertEvent({
      ...input,
      eventName: requiredString(component.metadata['eventName'], 'eventName'),
      ...(eventSchema === undefined ? {} : { eventSchema }),
    })
    return
  }
  if (component.type === 'eventHandler') {
    builder.upsertEventHandler({
      ...input,
      subscribedEvents: requiredStringArray(component.metadata['subscribedEvents'], 'subscribedEvents'),
    })
    return
  }
  if (component.type === 'ui') {
    builder.upsertUI({ ...input, route: requiredString(component.metadata['route'], 'route') })
    return
  }
  builder.upsertCustom({ ...input, customTypeName: component.type })
}

function requiredApiType(value: MetadataValue | undefined): 'REST' | 'GraphQL' | 'other' {
  if (value === 'REST' || value === 'GraphQL' || value === 'other') return value
  throw new InvalidRiviereBuilderInputError('Extracted api component must contain a supported apiType')
}

function optionalHttpMethod(
  value: MetadataValue | undefined,
): 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS' | undefined {
  if (
    value === 'GET' ||
    value === 'POST' ||
    value === 'PUT' ||
    value === 'PATCH' ||
    value === 'DELETE' ||
    value === 'HEAD' ||
    value === 'OPTIONS'
  ) {
    return value
  }
  return undefined
}

function requiredString(value: MetadataValue | undefined, name: string): string {
  if (typeof value === 'string' && value.trim() !== '') return value
  throw new InvalidRiviereBuilderInputError(`Extracted component must contain a string ${name}`)
}

function optionalString(value: MetadataValue | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function requiredStringArray(value: MetadataValue | undefined, name: string): string[] {
  if (Array.isArray(value) && value.every((item) => typeof item === 'string')) return value
  throw new InvalidRiviereBuilderInputError(`Extracted component must contain string[] ${name}`)
}
