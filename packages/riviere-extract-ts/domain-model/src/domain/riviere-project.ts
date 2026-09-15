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
import { type EnrichedComponent, EnrichmentResult } from './value-extraction/enriched-component'
import { ExtractionConfiguration } from './extraction-configuration'
import { executeEventCatalogImportStage } from './event-catalog/execute-event-catalog-import-stage'
import { executeAsyncApiImportStage } from './asyncapi/execute-asyncapi-import-stage'
import type { RiviereProjectCollaborators } from './ports/load-event-catalog-source'
import { RiviereModule } from './riviere-module'
import {
  assertEveryConfiguredModuleHasAnEntity,
  assertNoUnassignedDraftComponents,
} from './riviere-project-validation'
import {
  ExtractionConfigurationUnavailableError,
  GraphStateUnavailableError,
  InvalidWorkflowDefinitionError,
} from './riviere-project-errors'
import { Workflow, WorkflowRunMode } from './workflow'
import { applyCodeExtractionToBuilder } from './code-extraction/apply-code-extraction-to-builder'
import { executeCodeExtractionStage } from './code-extraction/execute-code-extraction-stage'
import {
  type CodeExtractionModule,
  type ExtractionProjectStartInput,
  type GraphOnlyProjectStartInput,
  type GraphWithWorkflowStartInput,
  type RiviereProjectStartInput,
  type RiviereProjectStartResult,
  type RiviereProjectStartSuccess,
  type SourceFileSelection,
  type WorkflowStartInput,
  type WorkflowStageValue,
  type ObserveConnectionDetectionPhase,
  observePhase,
} from './riviere-project-types'
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
    collaborators: RiviereProjectCollaborators,
  ): RiviereProjectStartSuccess
  static start(
    input: GraphWithWorkflowStartInput,
    collaborators: RiviereProjectCollaborators,
  ): RiviereProjectStartResult
  static start(
    input: ExtractionProjectStartInput,
    collaborators: RiviereProjectCollaborators,
  ): RiviereProjectStartResult
  static start(
    input: RiviereProjectStartInput,
    collaborators: RiviereProjectCollaborators,
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
      if (!workflowResult.success)
        return { success: false as const, error: workflowResult.error.message }
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
    const unassignedDraftComponents = input.draftComponents.filter(
      (component) => !new Set(modules.flatMap((module) => module.draftComponents())).has(component),
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
    collaborators: RiviereProjectCollaborators,
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
      case 'schema-validate': {
        const validation = this.graphBuilder().validate()
        if (validation.valid) return { success: true as const, diagnostics: [], warnings: [] }
        return {
          success: false as const,
          errorCode: 'GRAPH_VALIDATION_FAILED',
          reason: validation.errors.map((error) => error.message).join('\n'),
        }
      }
      case 'eventcatalog-import':
        return executeEventCatalogImportStage(this.graphBuilder(), stage.config, this.collaborators)
      case 'asyncapi-import':
        return executeAsyncApiImportStage(this.graphBuilder(), stage.config, this.collaborators)
      case 'code-extraction':
        return this.executeCodeExtractionStage(stage)
      case 'ai-extract':
      case 'ai-enrich':
        return {
          success: false as const,
          errorCode: 'STAGE_BEHAVIOUR_UNAVAILABLE',
          reason: `Stage behaviour is unavailable for '${stage.kind}'`,
        }
    }
  }
  private executeCodeExtractionStage(
    stage: Extract<WorkflowStageValue, { kind: 'code-extraction' }>,
  ) {
    const configPath = stage.configPath
    if (configPath === undefined) {
      return {
        success: false as const,
        errorCode: 'CODE_EXTRACTION_CONFIG_UNAVAILABLE',
        reason: `Code-extraction stage '${stage.name}' has no source configuration path`,
      }
    }
    try {
      const config = stage.config
      const repositoryName = this.collaborators.repositoryName
      const extraction = ExtractionConfiguration.parse({
        name: configPath,
        configPath,
        useTsConfig: true,
        repositoryName,
        resolvedConfig: config,
        moduleContexts: this.collaborators.loadCodeExtraction({
          config,
          configPath,
          repositoryName,
          useTsConfig: true,
        }),
      })
      const result = this.extractFrom(extraction)
      const components = stripResolvedCustomTypes(
        result.components,
        stage.config.connections?.httpLinks ?? [],
        result.links,
      )
      const warnings = applyCodeExtractionToBuilder(
        this.graphBuilder(),
        this.collaborators.repositoryName,
        components,
        result.links,
        result.externalLinks,
      )
      return { success: true as const, diagnostics: result.diagnostics, warnings }
    } catch (error) {
      return {
        success: false as const,
        errorCode: 'EXTRACTION_FIELD_FAILURE',
        reason: error instanceof Error ? error.message : String(error),
      }
    }
  }
  private extractFrom(extraction: ExtractionConfiguration) {
    return executeCodeExtractionStage({
      extraction,
      createModules: (loadedExtraction) => RiviereModule.fromConfiguration(loadedExtraction, []),
      detectConnections: (loadedExtraction, modules, components, allowIncomplete) =>
        this.detectConnectionsUsing(loadedExtraction, modules, components, allowIncomplete),
    })
  }
  extractDraftComponents(options: {
    sourceFileSelection?: SourceFileSelection
    allowIncomplete?: boolean
    includeConnections: boolean
    observeConnectionDetectionPhase?: ObserveConnectionDetectionPhase
  }) {
    assertEveryConfiguredModuleHasAnEntity(this.extractionConfiguration(), this.modules)
    const selection = options.sourceFileSelection ?? { kind: 'all' as const }
    const draftComponents = this.modules.flatMap((module) =>
      selection.kind === 'all'
        ? module.extractAllDraftComponents()
        : module.extractDraftComponentsFrom(new Set(selection.filePaths)),
    )
    this.unassignedDraftComponents = []
    return this.finishExtraction(draftComponents, options)
  }
  enrichDraftComponents(options: {
    allowIncomplete?: boolean
    includeConnections: boolean
    observeConnectionDetectionPhase?: ObserveConnectionDetectionPhase
  }) {
    assertEveryConfiguredModuleHasAnEntity(this.extractionConfiguration(), this.modules)
    const draftComponents = this.modules.flatMap((module) => module.draftComponents())
    return this.finishExtraction(draftComponents, options)
  }
  private finishExtraction(
    draftComponents: readonly DraftComponent[],
    options: {
      allowIncomplete?: boolean
      includeConnections: boolean
      observeConnectionDetectionPhase?: ObserveConnectionDetectionPhase
    },
  ) {
    if (!options.includeConnections) {
      return { kind: 'draftOnly' as const, components: draftComponents }
    }
    return this.enrichDraftComponentsAndDetectConnections({
      allowIncomplete:
        options.allowIncomplete === true || this.configuration?.allowIncomplete === true,
      ...(options.observeConnectionDetectionPhase === undefined
        ? {}
        : { observeConnectionDetectionPhase: options.observeConnectionDetectionPhase }),
    })
  }
  private enrichDraftComponentsAndDetectConnections(options: {
    allowIncomplete: boolean
    observeConnectionDetectionPhase?: ObserveConnectionDetectionPhase
  }) {
    assertNoUnassignedDraftComponents(this.unassignedDraftComponents, this.modules)
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
    modules: readonly CodeExtractionModule[],
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
    modules: readonly CodeExtractionModule[],
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
  private extractionConfiguration(): ExtractionConfiguration {
    if (this.configuration === undefined) {
      throw new ExtractionConfigurationUnavailableError()
    }
    return this.configuration
  }
  private graphBuilder(): RiviereBuilder {
    if (this.builder === undefined) {
      throw new GraphStateUnavailableError()
    }
    return this.builder
  }
}
