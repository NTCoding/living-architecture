import type {
  APIComponent,
  Component as PublishedComponent,
  ComponentType,
  CustomComponent,
  CustomPropertyDefinition,
  DomainMetadata,
  DomainOpComponent,
  EventComponent,
  EventHandlerComponent,
  ExternalLink as PublishedExternalLink,
  Link as PublishedLink,
  RiviereGraph,
  SourceInfo,
  SystemType,
  UIComponent,
  UseCaseComponent,
} from '@living-architecture/riviere-schema-published-language/schema'
import { ComponentId } from '@living-architecture/riviere-schema-published-language/component-id'
import { ValidationResult } from '@living-architecture/riviere-schema-published-language/graph-validation'
import { Component } from './component'
import { ComponentDefinition } from './component-definition'
import {
  BuildValidationError,
  ComponentNotFoundError,
  DuplicateComponentError,
  DuplicateLinkError,
  InvalidGraphError,
  MissingDomainsError,
  MissingSourcesError,
} from './construction/construction-errors'
import { ExistingValuePreference } from './existing-value-preference'
import { ExternalLink } from './external-link'
import { findNearMatches } from './error-recovery/component-suggestion'
import { RiviereGraphDefinition } from './riviere-graph-definition'
import { calculateStats, findOrphans, findWarnings } from './inspection/inspection-functions'
import type { ComponentSummaryStats } from './inspection/component-summary-stats'
import { Link } from './link'

type BuilderOptions = Readonly<{
  name?: string
  description?: string
  sources: readonly SourceInfo[]
  domains: Readonly<Record<string, DomainMetadata>>
}>
type DomainInput = Readonly<{ name: string; description: string; systemType: SystemType }>
type UpsertOptions = Readonly<{ noOverwrite?: boolean }>
type UIInput = Parameters<typeof ComponentDefinition.parseUI>[0]
type APIInput = Parameters<typeof ComponentDefinition.parseAPI>[0]
type UseCaseInput = Parameters<typeof ComponentDefinition.parseUseCase>[0]
type DomainOpInput = Parameters<typeof ComponentDefinition.parseDomainOp>[0]
type EventInput = Parameters<typeof ComponentDefinition.parseEvent>[0]
type EventHandlerInput = Parameters<typeof ComponentDefinition.parseEventHandler>[0]
type CustomInput = Parameters<typeof ComponentDefinition.parseCustom>[0]
type CustomTypeInput = Readonly<{
  name: string
  description?: string
  requiredProperties?: Readonly<Record<string, CustomPropertyDefinition>>
  optionalProperties?: Readonly<Record<string, CustomPropertyDefinition>>
}>
type RelationshipTypeInput = Readonly<{ name: string; description: string }>
type EnrichmentInput = Readonly<
  Pick<DomainOpComponent, 'entity' | 'stateChanges' | 'businessRules' | 'behavior' | 'signature'>
>
type LinkInput = Parameters<typeof Link.parseNew>[0]
type ExternalLinkInput = Parameters<typeof ExternalLink.parseNew>[0]
type ScalarOverwriteWarning = Readonly<{
  code: 'SCALAR_OVERWRITE'
  message: string
  componentId: string
  field: string
  oldValue: string | number | boolean
  newValue: string | number | boolean
}>
type DuplicateLinkWarning = Readonly<{
  code: 'DUPLICATE_LINK_SKIPPED'
  message: string
  source: string
  target: string
  linkType?: string
  targetRepository?: string
  targetName: string
}>
type OperationWarning = ScalarOverwriteWarning | DuplicateLinkWarning
type UpsertResult<T extends PublishedComponent = PublishedComponent> = Readonly<{
  component: T
  created: boolean
}>

/** @riviere-role aggregate */
export class RiviereBuilder {
  private readonly components = new Map<string, Component>()
  private readonly linksByStoredIdentity = new Map<string, Link>()
  private readonly linksByOccurrenceIdentity = new Map<string, Link>()
  private readonly externalLinks = new Map<string, ExternalLink>()
  private readonly operationWarnings: OperationWarning[] = []

  private constructor(
    private readonly version: string,
    private metadata: RiviereGraphDefinition,
    graph?: RiviereGraph,
  ) {
    for (const component of graph?.components ?? [])
      this.components.set(component.id, Component.create(component))
    for (const published of graph?.links ?? []) {
      const link = Link.parse(published)
      this.linksByStoredIdentity.set(link.storedIdentity(), link)
      this.linksByOccurrenceIdentity.set(link.occurrenceIdentity(), link)
    }
    for (const published of graph?.externalLinks ?? []) {
      const link = ExternalLink.parse(published)
      this.externalLinks.set(link.connectionIdentity(), link)
    }
  }

  /**
   * Restores a builder from a previously serialized graph.
   * @param graph - Graph to resume from.
   * @returns A builder with the graph state restored.
   */
  static resume(graph: RiviereGraph): RiviereBuilder {
    if (graph.metadata.sources === undefined || graph.metadata.sources.length === 0)
      throw new InvalidGraphError('missing sources')
    return new RiviereBuilder(graph.version, RiviereGraphDefinition.parse(graph.metadata), graph)
  }

  /**
   * Creates a new builder with its initial graph definition.
   * @param options - Initial sources, domains, and descriptive values.
   * @returns A new builder.
   */
  static new(options: BuilderOptions): RiviereBuilder {
    if (options.sources.length === 0) throw new MissingSourcesError()
    if (Object.keys(options.domains).length === 0) throw new MissingDomainsError()
    return new RiviereBuilder(
      '1.0',
      RiviereGraphDefinition.parse({
        ...(options.name === undefined ? {} : { name: options.name }),
        ...(options.description === undefined ? {} : { description: options.description }),
        sources: [...options.sources],
        domains: { ...options.domains },
      }),
    )
  }

  /**
   * Adds a source repository to the graph definition.
   * @param source - Source repository information.
   */
  addSource(source: SourceInfo): void {
    this.metadata = this.metadata.includingSource(source)
  }

  /**
   * Adds a domain to the graph definition.
   * @param input - Domain name, description, and system type.
   */
  addDomain(input: DomainInput): void {
    this.metadata = this.metadata.includingDomain(input.name, {
      description: input.description,
      systemType: input.systemType,
    })
  }

  /**
   * Adds a UI component.
   * @param input - UI component values.
   * @returns The added component.
   */
  addUI(input: UIInput): UIComponent {
    return this.add(ComponentDefinition.parseUI(input).publishedUI())
  }

  /**
   * Adds or updates a UI component.
   * @param input - UI component values.
   * @param options - Update behaviour.
   * @returns The component and whether it was created.
   */
  upsertUI(input: UIInput, options?: UpsertOptions) {
    return this.upsert(ComponentDefinition.parseUI(input).publishedUI(), options)
  }

  /**
   * Adds an API component.
   * @param input - API component values.
   * @returns The added component.
   */
  addApi(input: APIInput): APIComponent {
    return this.add(ComponentDefinition.parseAPI(input).publishedAPI())
  }

  /**
   * Adds or updates an API component.
   * @param input - API component values.
   * @param options - Update behaviour.
   * @returns The component and whether it was created.
   */
  upsertApi(input: APIInput, options?: UpsertOptions) {
    return this.upsert(ComponentDefinition.parseAPI(input).publishedAPI(), options)
  }

  /**
   * Adds a use case component.
   * @param input - Use case component values.
   * @returns The added component.
   */
  addUseCase(input: UseCaseInput): UseCaseComponent {
    return this.add(ComponentDefinition.parseUseCase(input).publishedUseCase())
  }

  /**
   * Adds or updates a use case component.
   * @param input - Use case component values.
   * @param options - Update behaviour.
   * @returns The component and whether it was created.
   */
  upsertUseCase(input: UseCaseInput, options?: UpsertOptions) {
    return this.upsert(ComponentDefinition.parseUseCase(input).publishedUseCase(), options)
  }

  /**
   * Adds a domain operation component.
   * @param input - Domain operation component values.
   * @returns The added component.
   */
  addDomainOp(input: DomainOpInput): DomainOpComponent {
    return this.add(ComponentDefinition.parseDomainOp(input).publishedDomainOp())
  }

  /**
   * Adds or updates a domain operation component.
   * @param input - Domain operation component values.
   * @param options - Update behaviour.
   * @returns The component and whether it was created.
   */
  upsertDomainOp(input: DomainOpInput, options?: UpsertOptions) {
    return this.upsert(ComponentDefinition.parseDomainOp(input).publishedDomainOp(), options)
  }

  /**
   * Adds an event component.
   * @param input - Event component values.
   * @returns The added component.
   */
  addEvent(input: EventInput): EventComponent {
    return this.add(ComponentDefinition.parseEvent(input).publishedEvent())
  }

  /**
   * Adds or updates an event component.
   * @param input - Event component values.
   * @param options - Update behaviour.
   * @returns The component and whether it was created.
   */
  upsertEvent(input: EventInput, options?: UpsertOptions) {
    return this.upsert(ComponentDefinition.parseEvent(input).publishedEvent(), options)
  }

  /**
   * Adds an event handler component.
   * @param input - Event handler component values.
   * @returns The added component.
   */
  addEventHandler(input: EventHandlerInput): EventHandlerComponent {
    return this.add(ComponentDefinition.parseEventHandler(input).publishedEventHandler())
  }

  /**
   * Adds or updates an event handler component.
   * @param input - Event handler component values.
   * @param options - Update behaviour.
   * @returns The component and whether it was created.
   */
  upsertEventHandler(input: EventHandlerInput, options?: UpsertOptions) {
    return this.upsert(
      ComponentDefinition.parseEventHandler(input).publishedEventHandler(),
      options,
    )
  }

  /**
   * Defines a custom component type.
   * @param input - Custom component type definition.
   */
  defineCustomType(input: CustomTypeInput): void {
    this.metadata = this.metadata.includingCustomType(input.name, {
      ...(input.description === undefined ? {} : { description: input.description }),
      ...(input.requiredProperties === undefined
        ? {}
        : { requiredProperties: { ...input.requiredProperties } }),
      ...(input.optionalProperties === undefined
        ? {}
        : { optionalProperties: { ...input.optionalProperties } }),
    })
  }

  /**
   * Defines a relationship type.
   * @param input - Relationship type definition.
   */
  defineRelationshipType(input: RelationshipTypeInput): void {
    this.metadata = this.metadata.includingRelationshipType(input.name, {
      description: input.description,
    })
  }

  /**
   * Adds a custom component.
   * @param input - Custom component values.
   * @returns The added component.
   */
  addCustom(input: CustomInput): CustomComponent {
    this.metadata.ensureCustomTypeAccepts(input.customTypeName, input.metadata)
    return this.add(ComponentDefinition.parseCustom(input).publishedCustom())
  }

  /**
   * Adds or updates a custom component.
   * @param input - Custom component values.
   * @param options - Update behaviour.
   * @returns The component and whether it was created.
   */
  upsertCustom(input: CustomInput, options?: UpsertOptions) {
    this.metadata.ensureCustomTypeAccepts(input.customTypeName, input.metadata)
    return this.upsert(
      ComponentDefinition.parseCustom(input).publishedCustom(),
      options,
      input.metadata,
    )
  }

  /**
   * Enriches a domain operation component.
   * @param id - Component identity.
   * @param enrichment - Domain operation details to add.
   */
  enrichComponent(id: string, enrichment: EnrichmentInput): void {
    this.component(id).enrichDomainOperation(enrichment)
  }

  /**
   * Finds components with similar names.
   * @param query - Component values used for matching.
   * @param options - Matching threshold and result limit.
   * @returns Components ordered by similarity.
   */
  nearMatches(
    query: Readonly<{ name: string; type?: ComponentType; domain?: string }>,
    options?: Readonly<{ threshold?: number; limit?: number }>,
  ) {
    return findNearMatches(this.publishedComponents(), query, options)
  }

  /**
   * Adds a link between two components.
   * @param input - Link values.
   * @returns The added link.
   */
  link(input: LinkInput): PublishedLink {
    this.component(input.from)
    if (input.relationshipType !== undefined)
      this.metadata.ensureRelationshipTypeExists(input.relationshipType)
    const link = Link.parseNew(input)
    if (
      this.linksByStoredIdentity.has(link.storedIdentity()) ||
      this.linksByOccurrenceIdentity.has(link.occurrenceIdentity())
    )
      throw new DuplicateLinkError(link.occurrenceIdentity())
    this.linksByStoredIdentity.set(link.storedIdentity(), link)
    this.linksByOccurrenceIdentity.set(link.occurrenceIdentity(), link)
    return link.published()
  }

  /**
   * Adds a link from a component to an external target.
   * @param input - External link values.
   * @returns The added or existing link.
   */
  linkExternal(input: ExternalLinkInput): PublishedExternalLink {
    this.component(input.from)
    const link = ExternalLink.parseNew(input)
    const existing = this.externalLinks.get(link.connectionIdentity())
    if (existing !== undefined) {
      this.operationWarnings.push({
        code: 'DUPLICATE_LINK_SKIPPED',
        message: `Duplicate external link '${input.from}' -> '${input.target.name}' (${input.type ?? 'unspecified'}) skipped`,
        source: input.from,
        target: input.target.name,
        ...(input.type === undefined ? {} : { linkType: input.type }),
        ...(input.target.repository === undefined
          ? {}
          : { targetRepository: input.target.repository }),
        targetName: input.target.name,
      })
      return existing.published()
    }
    this.externalLinks.set(link.connectionIdentity(), link)
    return link.published()
  }

  /** @returns Non fatal issues found in the graph. */
  warnings() {
    return [...findWarnings(this.inspectionGraph()), ...this.operationWarnings]
  }

  /** @returns Statistics for the current graph. */
  stats(): ComponentSummaryStats {
    return calculateStats(this.inspectionGraph())
  }

  /** @returns Validation results for the current graph. */
  validate(): ValidationResult {
    return ValidationResult.parse(this.publishedGraph())
  }

  /** @returns Component identities with no incoming or outgoing links. */
  orphans(): string[] {
    return findOrphans(this.inspectionGraph())
  }

  /** @returns The current graph encoded as JSON. */
  serialize(): string {
    return JSON.stringify(this.serializedGraph(), null, 2)
  }

  /** @returns The valid completed graph. */
  build(): RiviereGraph {
    const graph = this.publishedGraph()
    const result = ValidationResult.parse(graph)
    if (!result.valid) throw new BuildValidationError(result.errors.map((error) => error.message))
    return graph
  }

  private add<T extends PublishedComponent>(published: T): T {
    this.ensureComponentCanBeAdded(published)
    if (this.components.has(published.id)) throw new DuplicateComponentError(published.id)
    const component = Component.create(published)
    this.components.set(component.id(), component)
    return published
  }

  private upsert(published: UIComponent, options?: UpsertOptions): UpsertResult<UIComponent>
  private upsert(published: APIComponent, options?: UpsertOptions): UpsertResult<APIComponent>
  private upsert(
    published: UseCaseComponent,
    options?: UpsertOptions,
  ): UpsertResult<UseCaseComponent>
  private upsert(
    published: DomainOpComponent,
    options?: UpsertOptions,
  ): UpsertResult<DomainOpComponent>
  private upsert(published: EventComponent, options?: UpsertOptions): UpsertResult<EventComponent>
  private upsert(
    published: EventHandlerComponent,
    options?: UpsertOptions,
  ): UpsertResult<EventHandlerComponent>
  private upsert(
    published: CustomComponent,
    options?: UpsertOptions,
    incomingCustomProperties?: Readonly<Record<string, unknown>>,
  ): UpsertResult<CustomComponent>
  private upsert(
    published: PublishedComponent,
    options?: UpsertOptions,
    incomingCustomProperties?: Readonly<Record<string, unknown>>,
  ): UpsertResult
  private upsert(
    published: PublishedComponent,
    options?: UpsertOptions,
    incomingCustomProperties?: Readonly<Record<string, unknown>>,
  ): UpsertResult {
    this.ensureComponentCanBeAdded(published)
    const existing = this.components.get(published.id)
    if (existing === undefined) {
      const component = Component.create(published)
      this.components.set(component.id(), component)
      return { component: component.published(), created: true }
    }
    const update = existing.update(
      published,
      ExistingValuePreference.parse(options?.noOverwrite),
      incomingCustomProperties,
    )
    for (const overwrite of update.overwrites)
      this.operationWarnings.push({
        code: 'SCALAR_OVERWRITE',
        message: `Scalar field '${overwrite.field}' on component '${published.id}' overwritten`,
        componentId: published.id,
        ...overwrite,
      })
    return { component: update.component, created: false }
  }

  private ensureComponentCanBeAdded(published: PublishedComponent): void {
    this.metadata.ensureDomainExists(published.domain)
  }

  private component(id: string): Component {
    const component = this.components.get(id)
    if (component !== undefined) return component
    const parsed = ComponentId.parse(id)
    if (!parsed.success) throw new ComponentNotFoundError(id, [])
    const suggestions = findNearMatches(
      this.publishedComponents(),
      { name: parsed.componentId.name() },
      { limit: 3 },
    ).map((match) => match.component.id)
    throw new ComponentNotFoundError(id, suggestions)
  }

  private publishedComponents(): PublishedComponent[] {
    return [...this.components.values()].map((component) => component.published())
  }
  private publishedLinks(): PublishedLink[] {
    return [...this.linksByStoredIdentity.values()].map((link) => link.published())
  }
  private publishedExternalLinks(): PublishedExternalLink[] {
    return [...this.externalLinks.values()].map((link) => link.published())
  }
  private inspectionGraph() {
    return {
      version: this.version,
      metadata: this.metadata.published(),
      components: this.publishedComponents(),
      links: this.publishedLinks(),
      externalLinks: this.publishedExternalLinks(),
    }
  }
  private serializedGraph() {
    return this.inspectionGraph()
  }

  private publishedGraph(): RiviereGraph {
    const metadata = this.metadata.published()
    const customTypes =
      Object.keys(metadata.customTypes).length === 0 ? undefined : { ...metadata.customTypes }
    const relationshipTypes =
      Object.keys(metadata.relationshipTypes).length === 0
        ? undefined
        : { ...metadata.relationshipTypes }
    const externalLinks = this.publishedExternalLinks()
    return {
      version: this.version,
      metadata: {
        ...(metadata.name === undefined ? {} : { name: metadata.name }),
        ...(metadata.description === undefined ? {} : { description: metadata.description }),
        sources: [...metadata.sources],
        domains: { ...metadata.domains },
        ...(customTypes === undefined ? {} : { customTypes }),
        ...(relationshipTypes === undefined ? {} : { relationshipTypes }),
      },
      components: this.publishedComponents(),
      links: this.publishedLinks(),
      ...(externalLinks.length === 0 ? {} : { externalLinks }),
    }
  }
}
