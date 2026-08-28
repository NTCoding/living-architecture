import type { Project } from 'ts-morph'
import { ComponentDefinition } from '@living-architecture/riviere-builder-published-language'
import type { DraftComponent } from '../component-extraction/draft-component'
import { CallableReference } from '../connection-detection/call-graph/callable-reference'

type MetadataValue = string | number | boolean | string[]
type CommonDefinitionInput = Readonly<{
  name: string
  domain: string
  module: string
  repository: string
  filePath: string
  lineNumber: number
  description?: string
}>
type DefinitionResult = ReturnType<typeof ComponentDefinition.parse>

/** @riviere-role value-object */
export class EnrichedComponent {
  declare private brand: 'EnrichedComponent'
  readonly type: string
  readonly name: string
  readonly location: {
    file: string
    line: number
  }
  readonly domain: string
  readonly module: string
  readonly metadata: Record<string, MetadataValue>
  _missing: string[] | undefined

  static parse(params: {
    type: string
    name: string
    location: {
      file: string
      line: number
    }
    domain: string
    module: string
    metadata: Record<string, MetadataValue>
    _missing: string[] | undefined
  }): EnrichedComponent {
    return new EnrichedComponent(params)
  }

  private constructor(params: {
    type: string
    name: string
    location: {
      file: string
      line: number
    }
    domain: string
    module: string
    metadata: Record<string, MetadataValue>
    _missing: string[] | undefined
  }) {
    this.type = params.type
    this.name = params.name
    this.location = params.location
    this.domain = params.domain
    this.module = params.module
    this.metadata = params.metadata
    this._missing = params._missing
  }

  callableReferencesIn(project: Project): readonly CallableReference[] {
    const sourceFile = project.getSourceFile(this.location.file)
    if (sourceFile === undefined) return []

    const classDeclaration = sourceFile
      .getClasses()
      .find((candidate) => candidate.getStartLineNumber() === this.location.line)
    if (classDeclaration !== undefined) {
      const containerTypeName = classDeclaration.getName() ?? this.name
      return classDeclaration.getMethods().map((method) =>
        CallableReference.parse({
          kind: 'method',
          filePath: sourceFile.getFilePath(),
          lineNumber: method.getStartLineNumber(),
          callableName: method.getName(),
          containerTypeName,
        }),
      )
    }

    for (const candidateClass of sourceFile.getClasses()) {
      const method = candidateClass
        .getMethods()
        .find((candidate) => candidate.getStartLineNumber() === this.location.line)
      if (method !== undefined) {
        const containerTypeName = candidateClass.getName()
        return [
          CallableReference.parse({
            kind: 'method',
            filePath: sourceFile.getFilePath(),
            lineNumber: method.getStartLineNumber(),
            callableName: method.getName(),
            ...(containerTypeName === undefined ? {} : { containerTypeName }),
          }),
        ]
      }
    }

    const functionDeclaration = sourceFile
      .getFunctions()
      .find((candidate) => candidate.getStartLineNumber() === this.location.line)
    if (functionDeclaration === undefined) return []
    return [
      CallableReference.parse({
        kind: 'function',
        filePath: sourceFile.getFilePath(),
        lineNumber: functionDeclaration.getStartLineNumber(),
        callableName: functionDeclaration.getNameOrThrow(),
      }),
    ]
  }

  toComponentDefinition(repository: string): DefinitionResult {
    const common = commonDefinition(this, repository)
    switch (this.type) {
      case 'ui':
        return uiDefinition(common, this.metadata)
      case 'api':
        return apiDefinition(common, this.metadata)
      case 'useCase':
        return ComponentDefinition.parse({ ...common, componentType: 'UseCase' })
      case 'domainOp':
        return domainOperationDefinition(common, this.metadata)
      case 'event':
        return eventDefinition(common, this.metadata)
      case 'eventHandler':
        return eventHandlerDefinition(common, this.metadata)
      default:
        return {
          success: true,
          data: ComponentDefinition.parseCustom({
            name: this.name,
            domain: this.domain,
            module: this.module,
            sourceLocation: {
              repository,
              filePath: this.location.file,
              lineNumber: this.location.line,
            },
            customTypeName: this.type,
            metadata: this.metadata,
          }),
        }
    }
  }
}

/** @riviere-role value-object */
export class EnrichmentFailure {
  declare private brand: 'EnrichmentFailure'
  readonly component: DraftComponent
  readonly field: string
  readonly error: string

  static parse(params: {
    component: DraftComponent
    field: string
    error: string
  }): EnrichmentFailure {
    return new EnrichmentFailure(params)
  }

  private constructor(params: { component: DraftComponent; field: string; error: string }) {
    this.component = params.component
    this.field = params.field
    this.error = params.error
  }
}

/** @riviere-role value-object */
export class EnrichmentResult {
  declare private brand: 'EnrichmentResult'
  readonly components: EnrichedComponent[]
  readonly failures: EnrichmentFailure[]

  static parse(params: {
    components: EnrichedComponent[]
    failures: EnrichmentFailure[]
  }): EnrichmentResult {
    return new EnrichmentResult(params)
  }

  static mergeModuleResults(results: readonly EnrichmentResult[]): EnrichmentResult {
    const components: EnrichedComponent[] = []
    const failures: EnrichmentFailure[] = []
    for (const result of results) {
      components.push(...result.components)
      failures.push(...result.failures)
    }
    return EnrichmentResult.parse({ components, failures })
  }

  hasFailures(): boolean {
    return this.failures.length > 0
  }

  failedFieldNames(): readonly string[] {
    return [...new Set(this.failures.map((failure) => failure.field))]
  }

  private constructor(params: { components: EnrichedComponent[]; failures: EnrichmentFailure[] }) {
    this.components = params.components
    this.failures = params.failures
  }
}

export type { MetadataValue }

function stringValue(value: MetadataValue | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function stringList(value: MetadataValue | undefined): readonly string[] | undefined {
  if (Array.isArray(value)) return value
  return typeof value === 'string' ? [value] : undefined
}

function commonDefinition(component: EnrichedComponent, repository: string): CommonDefinitionInput {
  const description = stringValue(component.metadata['description'])
  return {
    name: component.name,
    domain: component.domain,
    module: component.module,
    repository,
    filePath: component.location.file,
    lineNumber: component.location.line,
    ...(description === undefined ? {} : { description }),
  }
}

function uiDefinition(
  common: CommonDefinitionInput,
  metadata: Readonly<Record<string, MetadataValue>>,
): DefinitionResult {
  const route = stringValue(metadata['route'])
  return ComponentDefinition.parse({
    ...common,
    componentType: 'UI',
    ...(route === undefined ? {} : { route }),
  })
}

function apiDefinition(
  common: CommonDefinitionInput,
  metadata: Readonly<Record<string, MetadataValue>>,
): DefinitionResult {
  const apiType = stringValue(metadata['apiType'])
  const httpMethod = stringValue(metadata['method'])
  const httpPath = stringValue(metadata['route'])
  return ComponentDefinition.parse({
    ...common,
    componentType: 'API',
    ...(apiType === undefined ? {} : { apiType }),
    ...(httpMethod === undefined ? {} : { httpMethod }),
    ...(httpPath === undefined ? {} : { httpPath }),
  })
}

function domainOperationDefinition(
  common: CommonDefinitionInput,
  metadata: Readonly<Record<string, MetadataValue>>,
): DefinitionResult {
  const operationName = stringValue(metadata['operationName'])
  const entity = stringValue(metadata['entity'])
  return ComponentDefinition.parse({
    ...common,
    componentType: 'DomainOp',
    ...(operationName === undefined ? {} : { operationName }),
    ...(entity === undefined ? {} : { entity }),
  })
}

function eventDefinition(
  common: CommonDefinitionInput,
  metadata: Readonly<Record<string, MetadataValue>>,
): DefinitionResult {
  const eventName = stringValue(metadata['eventName'])
  const eventSchema = stringValue(metadata['eventSchema'])
  return ComponentDefinition.parse({
    ...common,
    componentType: 'Event',
    ...(eventName === undefined ? {} : { eventName }),
    ...(eventSchema === undefined ? {} : { eventSchema }),
  })
}

function eventHandlerDefinition(
  common: CommonDefinitionInput,
  metadata: Readonly<Record<string, MetadataValue>>,
): DefinitionResult {
  const subscribedEvents = stringList(metadata['subscribedEvents'])?.join(',')
  return ComponentDefinition.parse({
    ...common,
    componentType: 'EventHandler',
    ...(subscribedEvents === undefined ? {} : { subscribedEvents }),
  })
}
