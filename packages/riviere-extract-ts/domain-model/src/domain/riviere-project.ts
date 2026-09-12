import {
  BuilderOptions,
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
import { executeEventCatalogImportStage } from './event-catalog/execute-event-catalog-import-stage'
import { EventCatalogSourceUnavailableError } from './event-catalog/event-catalog-source-unavailable-error'
import type { RiviereProjectCollaborators } from './ports/load-event-catalog-source'
import { RiviereModule } from './riviere-module'
import {
  ExtractionConfigurationUnavailableError,
  GraphStateUnavailableError,
  InvalidWorkflowDefinitionError,
} from './riviere-project-errors'
import { Workflow, WorkflowRunMode } from './workflow'
import type { WorkflowStageValue } from './workflow-stage'

export { OrphanedDraftComponentError } from './orphaned-draft-component-error'
export type { RiviereProjectCollaborators } from './ports/load-event-catalog-source'

/** @riviere-role aggregate */
export class RiviereProject {
  private constructor(
    private readonly configuration: ExtractionConfiguration | undefined,
    private readonly modules: readonly RiviereModule[],
    private unassignedDraftComponents: readonly DraftComponent[],
    private readonly collaborators: RiviereProjectCollaborators,
    private builder?: RiviereBuilder,
    private workflow?: Workflow,
  ) {}

  static start(
    input: GraphOnlyProjectStartInput,
    collaborators?: RiviereProjectCollaborators,
  ): RiviereProjectStartSuccess
  static start(
    input: GraphWithWorkflowStartInput,
    collaborators?: RiviereProjectCollaborators,
  ): RiviereProjectStartResult
  static start(
    input: ExtractionProjectStartInput,
    collaborators?: RiviereProjectCollaborators,
  ): RiviereProjectStartResult
  static start(
    input: RiviereProjectStartInput,
    collaborators: RiviereProjectCollaborators = unavailableCollaborators,
  ): RiviereProjectStartResult {
    if (input.graphDefinition !== undefined) {
      const builder = RiviereBuilder.parse(input.graphDefinition)
      if (input.workflowInput === undefined) {
        return {
          success: true as const,
          project: new RiviereProject(undefined, [], [], collaborators, builder),
        }
      }
      const workflowResult = Workflow.build(input.workflowInput)
      if (!workflowResult.success) {
        return { success: false as const, error: workflowResult.error.message }
      }
      return {
        success: true as const,
        project: new RiviereProject(
          undefined,
          [],
          [],
          collaborators,
          builder,
          workflowResult.workflow,
        ),
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
      project: new RiviereProject(
        input.configuration,
        modules,
        unassignedDraftComponents,
        collaborators,
      ),
    }
  }

  static rehydrate(
    graph: RiviereGraph,
    collaborators: RiviereProjectCollaborators = unavailableCollaborators,
    graphOptions = BuilderOptions.fromGraph(graph),
    workflowInput?: WorkflowStartInput,
  ): RiviereProject {
    const project = new RiviereProject(
      undefined,
      [],
      [],
      collaborators,
      RiviereBuilder.fromGraph(graph, graphOptions),
    )
    if (workflowInput === undefined) return project
    const workflowResult = Workflow.build(workflowInput)
    if (!workflowResult.success) {
      throw new InvalidWorkflowDefinitionError(workflowResult.error.message)
    }
    project.workflow = workflowResult.workflow
    return project
  }

  amendGraph<T>(amend: (builder: RiviereBuilder) => T): T {
    return amend(this.graphBuilder())
  }

  build(): RiviereGraph {
    return this.graphBuilder().build()
  }

  serialize(): string {
    return this.graphBuilder().serialize()
  }

  async rebuildGraph(mode: WorkflowRunMode = WorkflowRunMode.from('run')) {
    const workflow = this.workflow
    if (workflow === undefined) {
      return {
        success: false as const,
        errorCode: 'WORKFLOW_UNAVAILABLE',
        reason: 'No workflow is loaded',
        events: [],
        transitions: [],
        warnings: [],
      }
    }
    const previousBuilder = this.graphBuilder()
    this.builder = RiviereBuilder.parse(BuilderOptions.fromGraph(previousBuilder.build()))
    const run = await workflow.run(this.builder, mode, (stage) => this.executeWorkflowStage(stage))
    if (!run.value.success) {
      this.builder = previousBuilder
      return run.value
    }
    return {
      success: true as const,
      graph: this.graphBuilder().build(),
      outputPath: workflow.outputPath(),
      runLogDirectory: workflow.runLogDirectory(),
      events: run.value.events,
      transitions: run.value.transitions,
      warnings: run.value.warnings,
    }
  }

  private async executeWorkflowStage(stage: WorkflowStageValue) {
    switch (stage.kind) {
      case 'schema-validate':
        return this.executeSchemaValidationStage()
      case 'eventcatalog-import':
        return executeEventCatalogImportStage(this.graphBuilder(), stage.config, this.collaborators)
      case 'code-extraction':
      case 'asyncapi-import':
      case 'ai-extract':
      case 'ai-enrich':
        return {
          success: false as const,
          errorCode: 'STAGE_BEHAVIOUR_UNAVAILABLE',
          reason: `Stage behaviour is unavailable for '${stage.kind}'`,
        }
    }
  }

  private executeSchemaValidationStage() {
    const validation = this.graphBuilder().validate()
    if (validation.valid) return { success: true as const, diagnostics: [], warnings: [] }
    return {
      success: false as const,
      errorCode: 'GRAPH_VALIDATION_FAILED',
      reason: validation.errors.map((error) => error.message).join('\n'),
    }
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
    const enrichment = EnrichmentResult.from(
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

type WorkflowStartInput = Parameters<typeof Workflow.build>[0]

type GraphOnlyProjectStartInput = Readonly<{
  graphDefinition: Parameters<typeof RiviereBuilder.parse>[0]
  workflowInput?: undefined
  configuration?: undefined
  draftComponents?: undefined
}>

type GraphWithWorkflowStartInput = Readonly<{
  graphDefinition: Parameters<typeof RiviereBuilder.parse>[0]
  workflowInput: WorkflowStartInput
  configuration?: undefined
  draftComponents?: undefined
}>

type RiviereProjectStartInput =
  | ExtractionProjectStartInput
  | GraphOnlyProjectStartInput
  | GraphWithWorkflowStartInput
type RiviereProjectStartSuccess = Readonly<{ success: true; project: RiviereProject }>
type RiviereProjectStartResult =
  | RiviereProjectStartSuccess
  | Readonly<{ success: false; error: string }>

type SourceFileSelection =
  | { readonly kind: 'all' }
  | { readonly kind: 'files'; readonly filePaths: readonly string[] }

const unavailableCollaborators: RiviereProjectCollaborators = {
  loadEventCatalogSource: () => Promise.reject(new EventCatalogSourceUnavailableError()),
  repositoryName: '',
}

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
