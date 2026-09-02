import type {
  APIComponent,
  Component as PublishedComponent,
  CustomComponent,
  DomainOpComponent,
  EventComponent,
  EventHandlerComponent,
  ExternalLink as PublishedExternalLink,
  Link as PublishedLink,
  RiviereGraph,
  SourceInfo,
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
} from './construction-errors'
import { ExistingValuePreference } from './existing-value-preference'
import { ExternalLink } from './external-link'
import { GraphDiagnostics, type OperationWarning } from './graph-diagnostics'
import { RiviereGraphDefinition } from './riviere-graph-definition'
import { Link } from './link'
import {
  type BuilderOptions,
  type CustomTypeInput,
  type DomainInput,
  type RelationshipTypeInput,
} from './riviere-graph-definition-input'
import { type LinkExternalResult, type UpsertResult } from './riviere-builder-result'

type Publishable<T> = { published(): T }

type UpsertOptions = Readonly<{ noOverwrite?: boolean }>
type UIInput = Parameters<typeof ComponentDefinition.parseUI>[0]
type APIInput = Parameters<typeof ComponentDefinition.parseAPI>[0]
type UseCaseInput = Parameters<typeof ComponentDefinition.parseUseCase>[0]
type DomainOpInput = Parameters<typeof ComponentDefinition.parseDomainOp>[0]
type EventInput = Parameters<typeof ComponentDefinition.parseEvent>[0]
type EventHandlerInput = Parameters<typeof ComponentDefinition.parseEventHandler>[0]
type CustomInput = Parameters<typeof ComponentDefinition.parseCustom>[0]
type EnrichmentInput = Readonly<
  Pick<DomainOpComponent, 'entity' | 'stateChanges' | 'businessRules' | 'behavior' | 'signature'>
>
type LinkInput = Parameters<typeof Link.parseNew>[0]
type ExternalLinkInput = Parameters<typeof ExternalLink.parseNew>[0]

/** @riviere-role value-object */
export class RiviereBuilder {
  declare private readonly brand: 'RiviereBuilder'
  private readonly componentsById = new Map<string, Component>()
  private readonly linksByStoredIdentity = new Map<string, Link>()
  private readonly linksByOccurrenceIdentity = new Map<string, Link>()
  private readonly externalLinksByConnectionIdentity = new Map<string, ExternalLink>()
  private constructor(
    private readonly version: string,
    private metadata: RiviereGraphDefinition,
    graph?: RiviereGraph,
  ) {
    for (const component of graph?.components ?? [])
      this.componentsById.set(component.id, Component.fromState(component))
    for (const published of graph?.links ?? []) {
      const link = Link.parse(published)
      this.linksByStoredIdentity.set(link.storedIdentity(), link)
      this.linksByOccurrenceIdentity.set(link.occurrenceIdentity(), link)
    }
    for (const published of graph?.externalLinks ?? []) {
      const link = ExternalLink.parse(published)
      this.externalLinksByConnectionIdentity.set(link.connectionIdentity(), link)
    }
  }

  /**
   * Restores a builder from a previously serialized graph.
   * @param graph - Graph to resume from.
   * @returns A builder with the graph state restored.
   */
  static resume(graph: RiviereGraph): RiviereBuilder {
    return RiviereBuilder.fromGraph(graph)
  }

  /**
   * Creates a builder from persisted graph values.
   * @param graph - Graph values used to reconstruct the builder.
   * @returns A builder with equivalent graph construction state.
   */
  static fromGraph(graph: RiviereGraph, options?: BuilderOptions): RiviereBuilder {
    if (graph.metadata.sources === undefined || graph.metadata.sources.length === 0)
      throw new InvalidGraphError('missing sources')
    const graphOptions = options ?? RiviereBuilder.graphOptionsFrom(graph)
    return new RiviereBuilder(
      graph.version,
      RiviereGraphDefinition.parse({
        ...graph.metadata,
        ...graphOptions,
        sources: [...graphOptions.sources],
        domains: { ...graphOptions.domains },
      }),
      graph,
    )
  }

  static graphOptionsFrom(graph: RiviereGraph): BuilderOptions {
    const sources = graph.metadata.sources
    if (sources === undefined || sources.length === 0)
      throw new InvalidGraphError('missing sources')
    return {
      ...(graph.metadata.name === undefined ? {} : { name: graph.metadata.name }),
      ...(graph.metadata.description === undefined
        ? {}
        : { description: graph.metadata.description }),
      sources: [...sources],
      domains: { ...graph.metadata.domains },
    }
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

  /** Returns empty construction state with the same project graph definition. */
  fresh(): RiviereBuilder {
    const definition = this.metadata.published()
    return RiviereBuilder.new({
      ...(definition.name === undefined ? {} : { name: definition.name }),
      ...(definition.description === undefined ? {} : { description: definition.description }),
      sources: definition.sources,
      domains: definition.domains,
    })
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
  linkExternal(input: ExternalLinkInput): LinkExternalResult {
    this.component(input.from)
    const link = ExternalLink.parseNew(input)
    const existing = this.externalLinksByConnectionIdentity.get(link.connectionIdentity())
    if (existing !== undefined) {
      const warning: OperationWarning = {
        code: 'DUPLICATE_LINK_SKIPPED',
        message: `Duplicate external link '${input.from}' -> '${input.target.name}' (${input.type ?? 'unspecified'}) skipped`,
        source: input.from,
        target: input.target.name,
        ...(input.type === undefined ? {} : { linkType: input.type }),
        ...(input.target.repository === undefined
          ? {}
          : { targetRepository: input.target.repository }),
        targetName: input.target.name,
      }
      return {
        link: existing.published(),
        warnings: [warning],
      }
    }
    this.externalLinksByConnectionIdentity.set(link.connectionIdentity(), link)
    return {
      link: link.published(),
      warnings: [],
    }
  }

  components(): readonly PublishedComponent[] {
    return publishedSnapshot(this.published(this.componentsById.values()))
  }

  links(): readonly PublishedLink[] {
    return publishedSnapshot(this.published(this.linksByStoredIdentity.values()))
  }

  externalLinks(): readonly PublishedExternalLink[] {
    return publishedSnapshot(this.published(this.externalLinksByConnectionIdentity.values()))
  }

  /** @returns Non fatal issues found in the graph. */
  warnings() {
    return GraphDiagnostics.fromGraph(this.publishedGraph()).warnings()
  }

  /** @returns Validation results for the current graph. */
  validate(): ValidationResult {
    return ValidationResult.parse(this.publishedGraph())
  }

  /** @returns The current graph encoded as JSON. */
  serialize(): string {
    return JSON.stringify(
      this.metadata.inspectionGraph(
        this.version,
        this.published(this.componentsById.values()),
        this.published(this.linksByStoredIdentity.values()),
        this.published(this.externalLinksByConnectionIdentity.values()),
      ),
      null,
      2,
    )
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
    if (this.componentsById.has(published.id)) throw new DuplicateComponentError(published.id)
    const component = Component.fromState(published)
    this.componentsById.set(component.id(), component)
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
    const existing = this.componentsById.get(published.id)
    if (existing === undefined) {
      const component = Component.fromState(published)
      this.componentsById.set(component.id(), component)
      return {
        component: component.published(),
        created: true,
        warnings: [],
      }
    }
    const update = existing.update(
      published,
      ExistingValuePreference.parse(options?.noOverwrite),
      incomingCustomProperties,
    )
    const warnings: OperationWarning[] = update.overwrites.map((overwrite) => ({
      code: 'SCALAR_OVERWRITE',
      message: `Scalar field '${overwrite.field}' on component '${published.id}' overwritten`,
      componentId: published.id,
      ...overwrite,
    }))
    return {
      component: update.component,
      created: false,
      warnings,
    }
  }

  private ensureComponentCanBeAdded(published: PublishedComponent): void {
    this.metadata.ensureDomainExists(published.domain)
  }

  private component(id: string): Component {
    const component = this.componentsById.get(id)
    if (component !== undefined) return component
    const parsed = ComponentId.parse(id)
    if (!parsed.success) throw new ComponentNotFoundError(id, [])
    const suggestions = GraphDiagnostics.fromGraph(this.publishedGraph())
      .nearMatches({ name: parsed.componentId.name() }, { limit: 3 })
      .map((match) => match.component.id)
    throw new ComponentNotFoundError(id, suggestions)
  }

  private published<T>(values: Iterable<Publishable<T>>): T[] {
    return [...values].map((value) => value.published())
  }
  private publishedGraph(): RiviereGraph {
    return this.metadata.publishedGraph(
      this.version,
      this.published(this.componentsById.values()),
      this.published(this.linksByStoredIdentity.values()),
      this.published(this.externalLinksByConnectionIdentity.values()),
    )
  }
}

function publishedSnapshot<T extends object>(values: readonly T[]): readonly T[] {
  return values.map((value) => ({
    ...value,
    ...clonePublishedRecord(value),
  }))
}

function clonePublishedValue(value: unknown): unknown {
  if (value instanceof Map)
    return new Map(
      [...value].map(([key, nestedValue]) => [
        clonePublishedValue(key),
        clonePublishedValue(nestedValue),
      ]),
    )
  if (!Array.isArray(value) && !isPlainObject(value)) return value
  return Array.isArray(value) ? value.map(clonePublishedValue) : clonePublishedRecord(value)
}

function clonePublishedRecord(value: object): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).map(([field, nestedValue]) => [field, clonePublishedValue(nestedValue)]),
  )
}

function isPlainObject(value: unknown): value is object {
  if (typeof value !== 'object' || value === null) return false
  return Object.prototype.toString.call(value) === '[object Object]'
}
