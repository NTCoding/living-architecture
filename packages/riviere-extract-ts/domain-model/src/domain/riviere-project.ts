import {
  BuilderOptions,
  RiviereBuilder,
} from '@living-architecture/riviere-builder-published-language'
import type { CodeExtractionConfig } from '@living-architecture/riviere-extract-config-published-language'
import type { RiviereGraph } from '@living-architecture/riviere-schema-published-language/schema'
import { DraftComponent } from './component-extraction/draft-component'
import type { EnrichedComponent } from './value-extraction/enriched-component'
import { InvalidModuleSourcesError, MissingModuleSourceError } from './extraction-errors'
import { OrphanedDraftComponentError } from './orphaned-draft-component-error'
import { detectEventPublisherConnections } from './connection-detection/async-detection/detect-event-publisher-connections'
import { detectSubscribeConnections } from './connection-detection/async-detection/detect-subscribe-connections'
import { detectConnectionsFromCalls } from './connection-detection/call-graph/detect-connections-from-calls'
import {
  resolveHttpLinks,
  stripResolvedCustomTypes,
} from './connection-detection/resolve-http-links'
import { detectCodeExtractionConnections } from './code-extraction/detect-code-extraction-connections'
import { extractCodeExtraction } from './code-extraction/extract-code-extraction'
import { ExtractionConfiguration } from './extraction-configuration'
import { executeEventCatalogImportStage } from './event-catalog/execute-event-catalog-import-stage'
import { executeAsyncApiImportStage } from './asyncapi/execute-asyncapi-import-stage'
import type { RiviereProjectCollaborators } from './ports/load-event-catalog-source'
import type { ObserveConnectionDetectionPhase } from './ports/observe-connection-detection-phase'
import { CodeExtractionModules } from './ports/code-extraction-modules'
import { RiviereModule } from './riviere-module'
import {
  ExtractionConfigurationUnavailableError,
  GraphStateUnavailableError,
} from './riviere-project-errors'
import { Workflow, WorkflowRunMode } from './workflow'
import { applyCodeExtractionToBuilder } from './code-extraction/apply-code-extraction-to-builder'
import {
  ExtractionProjectStartInput,
  GraphOnlyProjectStartInput,
  GraphWithWorkflowStartInput,
  type WorkflowStartInput,
} from './riviere-project-start-inputs'
import type { WorkflowStageValue } from './workflow-stage'

export type { RiviereProjectCollaborators } from './ports/load-event-catalog-source'
type RiviereProjectStartInput =
  | ExtractionProjectStartInput
  | GraphOnlyProjectStartInput
  | GraphWithWorkflowStartInput
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
  ): RiviereProject
  static start(
    input: GraphWithWorkflowStartInput,
    collaborators: RiviereProjectCollaborators,
  ): RiviereProject
  static start(
    input: ExtractionProjectStartInput,
    collaborators: RiviereProjectCollaborators,
  ): RiviereProject
  static start(
    input: RiviereProjectStartInput,
    collaborators: RiviereProjectCollaborators,
  ): RiviereProject {
    if (
      input instanceof GraphOnlyProjectStartInput ||
      input instanceof GraphWithWorkflowStartInput
    ) {
      const builder = RiviereBuilder.parse(input.graphDefinition)
      if (input instanceof GraphOnlyProjectStartInput)
        return new RiviereProject(undefined, [], [], collaborators, builder)
      const workflow = Workflow.build(input.workflowInput)
      return new RiviereProject(undefined, [], [], collaborators, builder, workflow)
    }
    const sourceErrors = RiviereModule.configurationSourceErrors(input.configuration)
    if (sourceErrors.length > 0) throw new InvalidModuleSourcesError(sourceErrors.join('\n'))
    const modules = RiviereModule.fromConfiguration(input.configuration, input.draftComponents)
    const unassignedDraftComponents = input.draftComponents.filter(
      (component) => !new Set(modules.flatMap((module) => module.draftComponents())).has(component),
    )
    return new RiviereProject(
      input.configuration,
      modules,
      unassignedDraftComponents,
      collaborators,
    )
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
    project.workflow = Workflow.build(workflowInput)
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
      const extraction = this.loadStageExtraction(stage.config, configPath)
      const modules = RiviereModule.fromConfiguration(extraction, [])
      modules.forEach((module) => module.extractAllDraftComponents())
      const completion = this.extractFrom(extraction, modules, {})
      if (completion.kind === 'fieldFailure') {
        return {
          success: false as const,
          errorCode: 'EXTRACTION_FIELD_FAILURE',
          reason: `Extraction failed for fields: ${completion.failedFields.join(', ')}`,
        }
      }
      const warnings = applyCodeExtractionToBuilder(
        this.graphBuilder(),
        this.collaborators.repositoryName,
        completion.components,
        completion.links,
        completion.externalLinks,
      )
      return { success: true as const, diagnostics: completion.diagnostics, warnings }
    } catch (error) {
      return {
        success: false as const,
        errorCode: 'EXTRACTION_FIELD_FAILURE',
        reason: error instanceof Error ? error.message : String(error),
      }
    }
  }
  private loadStageExtraction(
    config: CodeExtractionConfig,
    configPath: string,
  ): ExtractionConfiguration {
    const repositoryName = this.collaborators.repositoryName
    const useTsConfig = true
    return ExtractionConfiguration.parse({
      name: configPath,
      configPath,
      useTsConfig,
      repositoryName,
      resolvedConfig: config,
      moduleContexts: this.collaborators.loadCodeExtraction({
        config,
        configPath,
        repositoryName,
        useTsConfig,
      }),
    })
  }
  extractDraftComponents(options: {
    sourceFileSelection?:
      | { readonly kind: 'all' }
      | { readonly kind: 'files'; readonly filePaths: readonly string[] }
    allowIncomplete?: boolean
    includeConnections: boolean
    observeConnectionDetectionPhase?: ObserveConnectionDetectionPhase
  }) {
    this.assertEveryConfiguredModuleHasAnEntity()
    const selection = options.sourceFileSelection ?? { kind: 'all' as const }
    this.modules.forEach((module) =>
      selection.kind === 'all'
        ? module.extractAllDraftComponents()
        : module.extractDraftComponentsFrom(new Set(selection.filePaths)),
    )
    this.unassignedDraftComponents = []
    return this.finishExtraction(options)
  }
  enrichDraftComponents(options: {
    allowIncomplete?: boolean
    includeConnections: boolean
    observeConnectionDetectionPhase?: ObserveConnectionDetectionPhase
  }) {
    this.assertEveryConfiguredModuleHasAnEntity()
    return this.finishExtraction(options)
  }
  private finishExtraction(options: {
    allowIncomplete?: boolean
    includeConnections: boolean
    observeConnectionDetectionPhase?: ObserveConnectionDetectionPhase
  }) {
    if (!options.includeConnections) {
      return {
        kind: 'draftOnly' as const,
        components: this.modules.flatMap((module) => module.draftComponents()),
      }
    }
    return this.extractFrom(this.extractionConfiguration(), this.modules, {
      ...(options.allowIncomplete === undefined
        ? {}
        : { allowIncomplete: options.allowIncomplete }),
      ...(options.observeConnectionDetectionPhase === undefined
        ? {}
        : { observeConnectionDetectionPhase: options.observeConnectionDetectionPhase }),
    })
  }
  private extractFrom(
    extraction: ExtractionConfiguration,
    modules: readonly RiviereModule[],
    options: {
      allowIncomplete?: boolean
      observeConnectionDetectionPhase?: ObserveConnectionDetectionPhase
    },
  ) {
    this.assertNoUnassignedDraftComponents()
    const completion = extractCodeExtraction({
      extraction,
      modules: CodeExtractionModules.from(modules),
      ...(options.allowIncomplete === undefined
        ? {}
        : { allowIncomplete: options.allowIncomplete }),
      detectConnections: (input) =>
        this.detectConnectionsUsing(
          input.extraction,
          input.modules,
          input.components,
          input.allowIncomplete,
          options.observeConnectionDetectionPhase,
        ),
    })
    if (completion.kind === 'fieldFailure') return completion
    return {
      ...completion,
      components: stripResolvedCustomTypes(
        completion.components,
        extraction.resolvedConfig.connections?.httpLinks ?? [],
        completion.links,
      ),
    }
  }
  public detectConnections(
    enrichedComponents: EnrichedComponent[],
    allowIncomplete: boolean,
    observeConnectionDetectionPhase?: ObserveConnectionDetectionPhase,
  ) {
    return this.detectConnectionsUsing(
      this.extractionConfiguration(),
      CodeExtractionModules.from(this.modules),
      enrichedComponents,
      allowIncomplete,
      observeConnectionDetectionPhase,
    )
  }
  private detectConnectionsUsing(
    configuration: ExtractionConfiguration,
    modules: CodeExtractionModules,
    enrichedComponents: readonly EnrichedComponent[],
    allowIncomplete: boolean,
    observeConnectionDetectionPhase?: ObserveConnectionDetectionPhase,
  ) {
    return detectCodeExtractionConnections({
      extraction: configuration,
      modules,
      components: enrichedComponents,
      allowIncomplete,
      ...(observeConnectionDetectionPhase === undefined ? {} : { observeConnectionDetectionPhase }),
      detectEventPublisherConnections,
      detectSubscribeConnections,
      detectConnectionsFromCalls,
      resolveHttpLinks,
    })
  }
  private assertEveryConfiguredModuleHasAnEntity(): void {
    for (const configuredModule of this.extractionConfiguration().resolvedConfig.modules) {
      if (!this.modules.some((module) => module.name() === configuredModule.name)) {
        throw new MissingModuleSourceError(configuredModule.name)
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
    if (this.builder === undefined) {
      throw new GraphStateUnavailableError()
    }
    return this.builder
  }
}
