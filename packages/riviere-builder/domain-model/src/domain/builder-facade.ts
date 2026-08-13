import type {
  APIComponent,
  CustomPropertyDefinition,
  CustomComponent,
  DomainMetadata,
  DomainOpComponent,
  EventComponent,
  EventHandlerComponent,
  ExternalLink,
  Link,
  RiviereGraph,
  SourceInfo,
  SystemType,
  UIComponent,
  UseCaseComponent,
} from '@living-architecture/riviere-schema/schema'
import type { ValidationResult } from '@living-architecture/riviere-schema/graph-validation'
import { RiviereBuilder as DomainBuilder } from './riviere-builder'
import type { RiviereQuery } from './query/RiviereQuery'

type BuilderOptions = Readonly<{
  name?: string
  description?: string
  sources: readonly SourceInfo[]
  domains: Readonly<Record<string, DomainMetadata>>
}>

type DomainInput = Readonly<{
  name: string
  description: string
  systemType: SystemType
}>

type UpsertOptions = Readonly<{ noOverwrite?: boolean }>

type UIInput = Readonly<
  Pick<UIComponent, 'name' | 'domain' | 'module' | 'route' | 'description' | 'sourceLocation'> & {
    metadata?: Readonly<Record<string, unknown>>
  }
>

type APIInput = Readonly<
  Pick<
    APIComponent,
    | 'name'
    | 'domain'
    | 'module'
    | 'apiType'
    | 'httpMethod'
    | 'path'
    | 'operationName'
    | 'description'
    | 'sourceLocation'
  > & { metadata?: Readonly<Record<string, unknown>> }
>

type UseCaseInput = Readonly<
  Pick<UseCaseComponent, 'name' | 'domain' | 'module' | 'description' | 'sourceLocation'> & {
    metadata?: Readonly<Record<string, unknown>>
  }
>

type DomainOpInput = Readonly<
  Pick<
    DomainOpComponent,
    | 'name'
    | 'domain'
    | 'module'
    | 'operationName'
    | 'entity'
    | 'signature'
    | 'behavior'
    | 'stateChanges'
    | 'businessRules'
    | 'description'
    | 'sourceLocation'
  > & { metadata?: Readonly<Record<string, unknown>> }
>

type EventInput = Readonly<
  Pick<
    EventComponent,
    'name' | 'domain' | 'module' | 'eventName' | 'eventSchema' | 'description' | 'sourceLocation'
  > & { metadata?: Readonly<Record<string, unknown>> }
>

type EventHandlerInput = Readonly<
  Pick<
    EventHandlerComponent,
    'name' | 'domain' | 'module' | 'subscribedEvents' | 'description' | 'sourceLocation'
  > & { metadata?: Readonly<Record<string, unknown>> }
>

type CustomTypeInput = Readonly<{
  name: string
  description?: string
  requiredProperties?: Readonly<Record<string, CustomPropertyDefinition>>
  optionalProperties?: Readonly<Record<string, CustomPropertyDefinition>>
}>

type RelationshipTypeInput = Readonly<{
  name: string
  description: string
}>

type CustomInput = Readonly<
  Pick<
    CustomComponent,
    'customTypeName' | 'name' | 'domain' | 'module' | 'description' | 'sourceLocation'
  > & { metadata?: Readonly<Record<string, unknown>> }
>

type EnrichmentInput = Readonly<
  Pick<DomainOpComponent, 'entity' | 'stateChanges' | 'businessRules' | 'behavior' | 'signature'>
>

type LinkInput = Readonly<{
  from: Link['source']
  to: Link['target']
  type?: Link['type']
  relationshipType?: Link['relationshipType']
  condition?: Link['condition']
  sourceLocation?: Link['sourceLocation']
}>

type ExternalLinkInput = Readonly<{
  from: ExternalLink['source']
  target: ExternalLink['target']
  type?: ExternalLink['type']
  description?: ExternalLink['description']
  sourceLocation?: ExternalLink['sourceLocation']
  metadata?: Readonly<Record<string, unknown>>
}>

/**
 * Programmatically construct Riviere architecture graphs.
 *
 * Thin facade preserving the flat public API while delegating
 * to focused domain classes internally.
 *
 * @riviere-role aggregate
 */
export class RiviereBuilder {
  private readonly delegate: DomainBuilder

  readonly graphPath: string

  private constructor(delegate: DomainBuilder) {
    this.delegate = delegate
    this.graphPath = delegate.graphPath
  }

  /**
   * Restores a builder from a previously serialized graph.
   *
   * @param graph - A valid RiviereGraph to resume from
   * @param graphPath - File path where the graph is persisted
   * @returns A new RiviereBuilder with the graph state restored
   */
  static resume(graph: RiviereGraph, graphPath = ''): RiviereBuilder {
    return new RiviereBuilder(DomainBuilder.resume(graph, graphPath))
  }

  /**
   * Creates a new builder with initial configuration.
   *
   * @param options - Configuration including sources and domains
   * @param graphPath - File path where the graph will be persisted
   * @returns A new RiviereBuilder instance
   */
  static new(options: BuilderOptions, graphPath = ''): RiviereBuilder {
    return new RiviereBuilder(DomainBuilder.new(options, graphPath))
  }

  /**
   * Adds an additional source repository to the graph.
   *
   * @param source - Source repository information
   */
  addSource(source: SourceInfo): void {
    this.delegate.construction.addSource(source)
  }

  /**
   * Adds a new domain to the graph.
   *
   * @param input - Domain name and description
   */
  addDomain(input: DomainInput): void {
    this.delegate.construction.addDomain(input)
  }

  /**
   * Adds a UI component to the graph.
   *
   * @param input - UI component properties
   * @returns The created UI component
   */
  addUI(input: UIInput): UIComponent {
    return this.delegate.construction.addUI(input)
  }

  /**
   * Adds or updates a UI component.
   *
   * @param input - UI component properties
   * @param options - Upsert behaviour
   * @returns The component and whether it was created
   */
  upsertUI(
    input: UIInput,
    options?: UpsertOptions,
  ): {
    component: UIComponent
    created: boolean
  } {
    return this.delegate.construction.upsertUI(input, options)
  }

  /**
   * Adds an API component to the graph.
   *
   * @param input - API component properties
   * @returns The created API component
   */
  addApi(input: APIInput): APIComponent {
    return this.delegate.construction.addApi(input)
  }

  /**
   * Adds or updates an API component.
   *
   * @param input - API component properties
   * @param options - Upsert behaviour
   * @returns The component and whether it was created
   */
  upsertApi(
    input: APIInput,
    options?: UpsertOptions,
  ): {
    component: APIComponent
    created: boolean
  } {
    return this.delegate.construction.upsertApi(input, options)
  }

  /**
   * Adds a UseCase component to the graph.
   *
   * @param input - UseCase component properties
   * @returns The created UseCase component
   */
  addUseCase(input: UseCaseInput): UseCaseComponent {
    return this.delegate.construction.addUseCase(input)
  }

  /**
   * Adds or updates a UseCase component.
   *
   * @param input - UseCase component properties
   * @param options - Upsert behaviour
   * @returns The component and whether it was created
   */
  upsertUseCase(
    input: UseCaseInput,
    options?: UpsertOptions,
  ): {
    component: UseCaseComponent
    created: boolean
  } {
    return this.delegate.construction.upsertUseCase(input, options)
  }

  /**
   * Adds a DomainOp component to the graph.
   *
   * @param input - DomainOp component properties
   * @returns The created DomainOp component
   */
  addDomainOp(input: DomainOpInput): DomainOpComponent {
    return this.delegate.construction.addDomainOp(input)
  }

  /**
   * Adds or updates a DomainOp component.
   *
   * @param input - DomainOp component properties
   * @param options - Upsert behaviour
   * @returns The component and whether it was created
   */
  upsertDomainOp(
    input: DomainOpInput,
    options?: UpsertOptions,
  ): {
    component: DomainOpComponent
    created: boolean
  } {
    return this.delegate.construction.upsertDomainOp(input, options)
  }

  /**
   * Adds an Event component to the graph.
   *
   * @param input - Event component properties
   * @returns The created Event component
   */
  addEvent(input: EventInput): EventComponent {
    return this.delegate.construction.addEvent(input)
  }

  /**
   * Adds or updates an Event component.
   *
   * @param input - Event component properties
   * @param options - Upsert behaviour
   * @returns The component and whether it was created
   */
  upsertEvent(
    input: EventInput,
    options?: UpsertOptions,
  ): {
    component: EventComponent
    created: boolean
  } {
    return this.delegate.construction.upsertEvent(input, options)
  }

  /**
   * Adds an EventHandler component to the graph.
   *
   * @param input - EventHandler component properties
   * @returns The created EventHandler component
   */
  addEventHandler(input: EventHandlerInput): EventHandlerComponent {
    return this.delegate.construction.addEventHandler(input)
  }

  /**
   * Adds or updates an EventHandler component.
   *
   * @param input - EventHandler component properties
   * @param options - Upsert behaviour
   * @returns The component and whether it was created
   */
  upsertEventHandler(
    input: EventHandlerInput,
    options?: UpsertOptions,
  ): {
    component: EventHandlerComponent
    created: boolean
  } {
    return this.delegate.construction.upsertEventHandler(input, options)
  }

  /**
   * Defines a custom component type for the graph.
   *
   * @param input - Custom type definition
   */
  defineCustomType(input: CustomTypeInput): void {
    this.delegate.construction.defineCustomType(input)
  }

  /**
   * Defines a relationship type for the graph.
   *
   * @param input - Relationship type name and description
   */
  defineRelationshipType(input: RelationshipTypeInput): void {
    this.delegate.construction.defineRelationshipType(input)
  }

  /**
   * Adds a Custom component to the graph.
   *
   * @param input - Custom component properties
   * @returns The created Custom component
   */
  addCustom(input: CustomInput): CustomComponent {
    return this.delegate.construction.addCustom(input)
  }

  /**
   * Adds or updates a Custom component.
   *
   * @param input - Custom component properties
   * @param options - Upsert behaviour
   * @returns The component and whether it was created
   */
  upsertCustom(
    input: CustomInput,
    options?: UpsertOptions,
  ): {
    component: CustomComponent
    created: boolean
  } {
    return this.delegate.construction.upsertCustom(input, options)
  }

  /**
   * Enriches a DomainOp component with additional domain details.
   *
   * @param id - The component ID to enrich
   * @param enrichment - State changes and business rules to add
   */
  enrichComponent(id: string, enrichment: EnrichmentInput): void {
    this.delegate.enrichment.enrichComponent(id, enrichment)
  }

  /**
   * Finds components similar to a query for error recovery.
   *
   * @param query - Search criteria including partial ID, name, type, or domain
   * @param options - Optional matching thresholds and limits
   * @returns Array of similar components with similarity scores
   */
  nearMatches(
    query: Readonly<{
      name: string
      type?: import('@living-architecture/riviere-schema/schema').ComponentType
      domain?: string
    }>,
    options?: Readonly<{
      threshold?: number
      limit?: number
    }>,
  ) {
    return this.delegate.errorRecovery.findNearMatches(query, options)
  }

  /**
   * Creates a link between two components in the graph.
   *
   * @param input - Link properties including source, target, and type
   * @returns The created link
   */
  link(input: LinkInput): Link {
    return this.delegate.linking.link(input)
  }

  /**
   * Creates a link from a component to an external system.
   *
   * @param input - External link properties including target system info
   * @returns The created external link
   */
  linkExternal(input: ExternalLinkInput): ExternalLink {
    return this.delegate.linking.linkExternal(input)
  }

  /**
   * Returns non-fatal issues found in the graph.
   *
   * @returns Array of warning objects with type and message
   */
  warnings() {
    return this.delegate.inspection.warnings()
  }

  /**
   * Returns statistics about the current graph state.
   *
   * @returns Counts of components by type, domains, and links
   */
  stats() {
    return this.delegate.inspection.stats()
  }

  /**
   * Runs full validation on the graph.
   *
   * @returns Validation result with valid flag and error details
   */
  validate(): ValidationResult {
    return this.delegate.inspection.validate()
  }

  /**
   * Returns IDs of components with no incoming or outgoing links.
   *
   * @returns Array of orphaned component IDs
   */
  orphans(): string[] {
    return this.delegate.inspection.orphans()
  }

  /**
   * Returns query capabilities for the current graph state.
   *
   * @returns A snapshot that can be queried without mutating the builder
   */
  query(): RiviereQuery {
    return this.delegate.inspection.query()
  }

  /**
   * Serializes the current graph state as a JSON string.
   *
   * @returns JSON string representation of the graph
   */
  serialize(): string {
    return this.delegate.serialize()
  }

  /**
   * Validates and returns the completed graph.
   *
   * @returns Valid RiviereGraph object
   */
  build(): RiviereGraph {
    return this.delegate.build()
  }
}
