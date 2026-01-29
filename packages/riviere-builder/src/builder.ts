import type {
  APIComponent,
  CustomComponent,
  DomainOpComponent,
  EventComponent,
  EventHandlerComponent,
  ExternalLink,
  Link,
  RiviereGraph,
  SourceInfo,
  UIComponent,
  UseCaseComponent,
} from '@living-architecture/riviere-schema'
import type { ValidationResult } from '@living-architecture/riviere-query'
import { RiviereBuilder as DomainBuilder } from './domain/riviere-builder'
import type {
  APIInput,
  BuilderOptions,
  BuilderStats,
  BuilderWarning,
  CustomInput,
  CustomTypeInput,
  DomainInput,
  DomainOpInput,
  EnrichmentInput,
  EventHandlerInput,
  EventInput,
  ExternalLinkInput,
  LinkInput,
  NearMatchMismatch,
  NearMatchOptions,
  NearMatchQuery,
  NearMatchResult,
  UIInput,
  UseCaseInput,
} from './types'

export type {
  APIInput,
  BuilderOptions,
  BuilderStats,
  BuilderWarning,
  CustomInput,
  CustomTypeInput,
  DomainInput,
  DomainOpInput,
  EnrichmentInput,
  EventHandlerInput,
  EventInput,
  ExternalLinkInput,
  LinkInput,
  NearMatchMismatch,
  NearMatchOptions,
  NearMatchQuery,
  NearMatchResult,
  UIInput,
  UseCaseInput,
}

/**
 * Programmatically construct Riviere architecture graphs.
 *
 * Thin facade preserving the flat public API while delegating
 * to focused domain classes internally.
 */
export class RiviereBuilder {
  private readonly delegate: DomainBuilder

  private constructor(delegate: DomainBuilder) {
    this.delegate = delegate
  }

  /**
   * Restores a builder from a previously serialized graph.
   *
   * @param graph - A valid RiviereGraph to resume from
   * @returns A new RiviereBuilder with the graph state restored
   */
  static resume(graph: RiviereGraph): RiviereBuilder {
    return new RiviereBuilder(DomainBuilder.resume(graph))
  }

  /**
   * Creates a new builder with initial configuration.
   *
   * @param options - Configuration including sources and domains
   * @returns A new RiviereBuilder instance
   */
  static new(options: BuilderOptions): RiviereBuilder {
    return new RiviereBuilder(DomainBuilder.new(options))
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
   * Adds an API component to the graph.
   *
   * @param input - API component properties
   * @returns The created API component
   */
  addApi(input: APIInput): APIComponent {
    return this.delegate.construction.addApi(input)
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
   * Adds a DomainOp component to the graph.
   *
   * @param input - DomainOp component properties
   * @returns The created DomainOp component
   */
  addDomainOp(input: DomainOpInput): DomainOpComponent {
    return this.delegate.construction.addDomainOp(input)
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
   * Adds an EventHandler component to the graph.
   *
   * @param input - EventHandler component properties
   * @returns The created EventHandler component
   */
  addEventHandler(input: EventHandlerInput): EventHandlerComponent {
    return this.delegate.construction.addEventHandler(input)
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
   * Adds a Custom component to the graph.
   *
   * @param input - Custom component properties
   * @returns The created Custom component
   */
  addCustom(input: CustomInput): CustomComponent {
    return this.delegate.construction.addCustom(input)
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
  nearMatches(query: NearMatchQuery, options?: NearMatchOptions): NearMatchResult[] {
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
  warnings(): BuilderWarning[] {
    return this.delegate.inspection.warnings()
  }

  /**
   * Returns statistics about the current graph state.
   *
   * @returns Counts of components by type, domains, and links
   */
  stats(): BuilderStats {
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
   * Returns a RiviereQuery instance for the current graph state.
   *
   * @returns RiviereQuery instance for the current graph
   */
  query(): import('@living-architecture/riviere-query').RiviereQuery {
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
