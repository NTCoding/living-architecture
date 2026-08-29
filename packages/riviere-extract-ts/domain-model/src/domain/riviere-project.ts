import {
  ComponentDefinition,
  RiviereBuilder,
} from '@living-architecture/riviere-builder-published-language'
import type { RiviereGraph } from '@living-architecture/riviere-schema-published-language/schema'
import { DraftComponent } from './component-extraction/draft-component'
import { AsyncDetectionOptions } from './connection-detection/async-detection/async-detection-options'
import { detectEventPublisherConnections } from './connection-detection/async-detection/detect-event-publisher-connections'
import { detectSubscribeConnections } from './connection-detection/async-detection/detect-subscribe-connections'
import { ComponentIndex } from './connection-detection/component-index'
import { ConnectionDetectionResult } from './connection-detection/connection-detection-result'
import { detectConnectionsFromCalls } from './connection-detection/call-graph/detect-connections-from-calls'
import { ScopedCallGraph } from './connection-detection/call-graph/scoped-call-graph'
import {
  resolveHttpLinks,
  stripResolvedCustomTypes,
} from './connection-detection/resolve-http-links'
import { OrphanedDraftComponentError } from './orphaned-draft-component-error'
import { MissingModuleSourceError } from './extraction-errors'
import { type EnrichedComponent, EnrichmentResult } from './value-extraction/enriched-component'
import type { ExtractionConfiguration } from './extraction-configuration'
import type { ObserveConnectionDetectionPhase } from './ports/observe-connection-detection-phase'
import { RiviereModule } from './riviere-module'
import {
  ExtractionConfigurationUnavailableError,
  GraphStateUnavailableError,
} from './riviere-project-errors'
import { Workflow } from './workflow'
import type { WorkflowStageValue } from './workflow-stage'

export { OrphanedDraftComponentError } from './orphaned-draft-component-error'

/** @riviere-role aggregate */
export class RiviereProject {
  private constructor(
    private readonly configuration: ExtractionConfiguration | undefined,
    private readonly modules: readonly RiviereModule[],
    private unassignedDraftComponents: readonly DraftComponent[],
    private builder?: RiviereBuilder,
    private readonly workflows: Workflow[] = [],
  ) {}

  static start(input: GraphProjectStartInput): RiviereProjectStartSuccess
  static start(input: ExtractionProjectStartInput): RiviereProjectStartResult
  static start(input: RiviereProjectStartInput): RiviereProjectStartResult
  static start(input: RiviereProjectStartInput): RiviereProjectStartResult {
    if (input.graphDefinition !== undefined) {
      return {
        success: true as const,
        data: new RiviereProject(undefined, [], [], RiviereBuilder.new(input.graphDefinition)),
      }
    }
    const sourceErrors = RiviereModule.configurationSourceErrors(input.configuration)
    if (sourceErrors.length > 0) return { success: false, error: sourceErrors.join('\n') }
    const modules = RiviereModule.fromConfiguration(input.configuration, input.draftComponents)
    const assignedDraftComponents = new Set(modules.flatMap((module) => module.draftComponents()))
    const unassignedDraftComponents = input.draftComponents.filter(
      (component) => !assignedDraftComponents.has(component),
    )
    return {
      success: true as const,
      data: new RiviereProject(input.configuration, modules, unassignedDraftComponents),
    }
  }

  static rehydrate(graph: RiviereGraph, graphOptions = RiviereBuilder.graphOptionsFrom(graph)) {
    return new RiviereProject(undefined, [], [], RiviereBuilder.fromGraph(graph, graphOptions))
  }

  addWorkflow(input: Parameters<typeof Workflow.start>[0]) {
    const result = Workflow.start(input)
    if (result.success) this.workflows.push(result.data)
    return result
  }

  addSource(input: Parameters<RiviereBuilder['addSource']>[0]): void {
    this.graphBuilder().addSource(input)
  }

  addDomain(input: Parameters<RiviereBuilder['addDomain']>[0]): void {
    this.graphBuilder().addDomain(input)
  }

  addComponent(definition: ComponentDefinition['value']): string {
    const builder = this.graphBuilder()
    switch (definition.type) {
      case 'UI':
        return builder.addUI(definition.input).id
      case 'API':
        return builder.addApi(definition.input).id
      case 'UseCase':
        return builder.addUseCase(definition.input).id
      case 'DomainOp':
        return builder.addDomainOp(definition.input).id
      case 'Event':
        return builder.addEvent(definition.input).id
      case 'EventHandler':
        return builder.addEventHandler(definition.input).id
      case 'Custom':
        return builder.addCustom(definition.input).id
    }
  }

  defineCustomType(input: Parameters<RiviereBuilder['defineCustomType']>[0]): void {
    this.graphBuilder().defineCustomType(input)
  }

  defineRelationshipType(input: Parameters<RiviereBuilder['defineRelationshipType']>[0]): void {
    this.graphBuilder().defineRelationshipType(input)
  }

  enrichComponent(...input: Parameters<RiviereBuilder['enrichComponent']>): void {
    this.graphBuilder().enrichComponent(...input)
  }

  link(input: Parameters<RiviereBuilder['link']>[0]) {
    return this.graphBuilder().link(input)
  }

  linkExternal(input: Parameters<RiviereBuilder['linkExternal']>[0]) {
    return this.graphBuilder().linkExternal(input)
  }

  warnings() {
    return this.graphBuilder().warnings()
  }

  validate() {
    return this.graphBuilder().validate()
  }

  build(): RiviereGraph {
    return this.graphBuilder().build()
  }

  serialize(): string {
    return this.graphBuilder().serialize()
  }

  rebuildGraph(workflowName: string) {
    const workflow = this.workflows.find((candidate) => candidate.name() === workflowName)
    if (workflow === undefined) {
      return workflowFailure('WORKFLOW_NOT_FOUND', `Workflow '${workflowName}' was not found`)
    }
    const previousBuilder = this.builder
    if (previousBuilder === undefined) {
      return workflowFailure('GRAPH_STATE_UNAVAILABLE', 'Graph state is unavailable')
    }
    this.builder = RiviereBuilder.new(RiviereBuilder.graphOptionsFrom(previousBuilder.build()))
    const run = workflow.run(this.builder, (stage, components) =>
      this.executeWorkflowStage(stage, components),
    )
    if (!run.success) {
      this.builder = previousBuilder
      return run
    }
    return {
      success: true as const,
      graph: this.graphBuilder().build(),
      outputPath: workflow.outputPath(),
      runLogDirectory: workflow.runLogDirectory(),
      events: run.events,
      warnings: run.warnings,
    }
  }

  private executeWorkflowStage(
    stage: Exclude<WorkflowStageValue, { kind: 'validate' }>,
    accumulatedComponents: readonly EnrichedComponent[],
  ) {
    switch (stage.kind) {
      case 'extract':
        return this.executeExtractionStage(stage.configuration)
      case 'link':
        return this.executeLinkStage(stage.configuration, accumulatedComponents)
    }
  }

  private executeExtractionStage(configuration: ExtractionConfiguration) {
    const modules = RiviereModule.fromConfiguration(configuration, [])
    modules.forEach((module) => module.extractAllDraftComponents())
    const enrichment = EnrichmentResult.mergeModuleResults(
      modules.map((module) => module.enrichDraftComponents()),
    )
    if (enrichment.hasFailures()) {
      return {
        success: false as const,
        errorCode: 'FIELD_ENRICHMENT_FAILED',
        reason: `Field enrichment failed: ${enrichment.failedFieldNames().join(', ')}`,
      }
    }
    return {
      success: true as const,
      kind: 'components' as const,
      components: enrichment.components,
      repository: configuration.repositoryName,
    }
  }

  private executeLinkStage(
    configuration: ExtractionConfiguration,
    components: readonly EnrichedComponent[],
  ) {
    const modules = RiviereModule.fromConfiguration(configuration, [])
    const connections = this.detectConnectionsUsing(configuration, modules, components, false)
    return { success: true as const, kind: 'connections' as const, connections }
  }

  extractDraftComponents(options: {
    sourceFileSelection?: SourceFileSelection
    allowIncomplete: boolean
    includeConnections: boolean
    observeConnectionDetectionPhase?: ObserveConnectionDetectionPhase
  }) {
    this.assertEveryConfiguredModuleHasAnEntity()
    const selection = options.sourceFileSelection ?? { kind: 'all' as const }
    const draftComponents = this.modules.flatMap((module) =>
      selection.kind === 'all'
        ? module.extractAllDraftComponents()
        : module.extractDraftComponentsFrom(new Set(selection.filePaths)),
    )
    this.unassignedDraftComponents = []

    if (!options.includeConnections) {
      return {
        kind: 'draftOnly' as const,
        components: draftComponents,
      }
    }

    return this.enrichDraftComponentsAndDetectConnections(options)
  }

  enrichDraftComponents(options: {
    allowIncomplete: boolean
    includeConnections: boolean
    observeConnectionDetectionPhase?: ObserveConnectionDetectionPhase
  }) {
    this.assertEveryConfiguredModuleHasAnEntity()
    const draftComponents = this.modules.flatMap((module) => module.draftComponents())
    if (!options.includeConnections) {
      return {
        kind: 'draftOnly' as const,
        components: draftComponents,
      }
    }

    return this.enrichDraftComponentsAndDetectConnections(options)
  }

  private enrichDraftComponentsAndDetectConnections(options: {
    allowIncomplete: boolean
    observeConnectionDetectionPhase?: ObserveConnectionDetectionPhase
  }) {
    this.assertNoUnassignedDraftComponents()
    const enrichment = EnrichmentResult.mergeModuleResults(
      this.modules
        .filter((module) => module.draftComponents().length > 0)
        .map((module) => module.enrichDraftComponents()),
    )
    const failedFields = enrichment.failedFieldNames()
    if (enrichment.hasFailures() && !options.allowIncomplete) {
      return { kind: 'fieldFailure' as const, failedFields }
    }
    const connectionResult = this.detectConnections(
      enrichment.components,
      options.allowIncomplete,
      options.observeConnectionDetectionPhase,
    )
    const httpLinks = this.extractionConfiguration().resolvedConfig.connections?.httpLinks ?? []
    return {
      kind: 'full' as const,
      components: stripResolvedCustomTypes(
        enrichment.components,
        httpLinks,
        connectionResult.links,
      ),
      failedFields,
      links: connectionResult.links,
      externalLinks: connectionResult.externalLinks,
    }
  }

  public detectConnections(
    enrichedComponents: EnrichedComponent[],
    allowIncomplete: boolean,
    observeConnectionDetectionPhase?: ObserveConnectionDetectionPhase,
  ) {
    return this.detectConnectionsUsing(
      this.extractionConfiguration(),
      this.modules,
      enrichedComponents,
      allowIncomplete,
      observeConnectionDetectionPhase,
    )
  }

  private detectConnectionsUsing(
    configuration: ExtractionConfiguration,
    modules: readonly RiviereModule[],
    enrichedComponents: readonly EnrichedComponent[],
    allowIncomplete: boolean,
    observeConnectionDetectionPhase?: ObserveConnectionDetectionPhase,
  ) {
    return observePhase(observeConnectionDetectionPhase, 'total', () => {
      const componentIndex = observePhase(observeConnectionDetectionPhase, 'setup', () =>
        ComponentIndex.parse(enrichedComponents),
      )
      const strict = !allowIncomplete
      const scopedCallGraphs = observePhase(observeConnectionDetectionPhase, 'callGraph', () =>
        this.buildScopedCallGraphs(modules, enrichedComponents, componentIndex, strict),
      )
      return observePhase(observeConnectionDetectionPhase, 'detection', () => {
        const connectionsDetectedFromCalls = scopedCallGraphs.flatMap((graph) =>
          detectConnectionsFromCalls(graph, configuration.repositoryName),
        )
        const asyncOptions = AsyncDetectionOptions.parse({
          strict,
          repository: configuration.repositoryName,
        })
        const connectionsDetectedFromEvents = [
          ...detectEventPublisherConnections(
            enrichedComponents,
            configuration.resolvedConfig.connections?.eventPublishers ?? [],
            asyncOptions,
          ),
          ...detectSubscribeConnections(enrichedComponents, asyncOptions),
        ]
        const resolvedHttpConnections = resolveHttpLinks(
          connectionsDetectedFromCalls,
          enrichedComponents,
          configuration.resolvedConfig.connections?.httpLinks ?? [],
        )
        return ConnectionDetectionResult.parse({
          links: [...resolvedHttpConnections.links, ...connectionsDetectedFromEvents],
          externalLinks: resolvedHttpConnections.externalLinks,
        })
      })
    })
  }

  private buildScopedCallGraphs(
    modules: readonly RiviereModule[],
    enrichedComponents: readonly EnrichedComponent[],
    componentIndex: ComponentIndex,
    strict: boolean,
  ): ScopedCallGraph[] {
    return modules.map((module) => {
      const components = enrichedComponents.filter((component) => module.owns(component))
      return ScopedCallGraph.from({
        project: module.typeScriptProject(),
        sourceFilePaths: module.sourceFilePaths(),
        components,
        componentIndex,
        strict,
      })
    })
  }

  private assertEveryConfiguredModuleHasAnEntity(): void {
    for (const configuration of this.extractionConfiguration().resolvedConfig.modules) {
      if (!this.modules.some((module) => module.name() === configuration.name)) {
        throw new MissingModuleSourceError(configuration.name)
      }
    }
  }

  private assertNoUnassignedDraftComponents(): void {
    if (this.unassignedDraftComponents.length === 0) return
    throw new OrphanedDraftComponentError(
      [...new Set(this.unassignedDraftComponents.map((draft) => draft.domain))],
      this.modules.map((module) => module.domain()),
      'domains',
    )
  }

  private extractionConfiguration(): ExtractionConfiguration {
    if (this.configuration === undefined) {
      throw new ExtractionConfigurationUnavailableError()
    }
    return this.configuration
  }

  private graphBuilder(): RiviereBuilder {
    if (this.builder === undefined) throw new GraphStateUnavailableError()
    return this.builder
  }
}

type ExtractionProjectStartInput = Readonly<{
  configuration: ExtractionConfiguration
  draftComponents: readonly DraftComponent[]
  graphDefinition?: undefined
}>

type GraphProjectStartInput = Readonly<{
  graphDefinition: Parameters<typeof RiviereBuilder.new>[0]
  configuration?: undefined
  draftComponents?: undefined
}>

type RiviereProjectStartInput = ExtractionProjectStartInput | GraphProjectStartInput
type RiviereProjectStartSuccess = Readonly<{ success: true; data: RiviereProject }>
type RiviereProjectStartResult =
  | RiviereProjectStartSuccess
  | Readonly<{ success: false; error: string }>

type SourceFileSelection =
  | { readonly kind: 'all' }
  | { readonly kind: 'files'; readonly filePaths: readonly string[] }

function observePhase<T>(
  observer: ObserveConnectionDetectionPhase | undefined,
  phase: 'setup' | 'callGraph' | 'detection' | 'total',
  operation: () => T,
): T {
  observer?.({ phase, status: 'started' })
  try {
    return operation()
  } finally {
    observer?.({ phase, status: 'completed' })
  }
}

function workflowFailure(errorCode: string, reason: string) {
  return {
    success: false as const,
    errorCode,
    reason,
    events: [],
    warnings: [],
  }
}
