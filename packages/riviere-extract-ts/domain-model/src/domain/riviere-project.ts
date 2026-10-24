import {
  BuilderOptions,
  RiviereBuilder,
} from '@living-architecture/riviere-builder-published-language'
import type { RiviereGraph } from '@living-architecture/riviere-schema-published-language/schema'
import { DraftComponent } from './component-extraction/draft-component'
import type { EnrichedComponent } from './value-extraction/enriched-component'
import { InvalidModuleSourcesError } from './extraction-errors'
import { ExtractionConfiguration } from './extraction-configuration'
import type { RiviereProjectCollaborators } from './ports/load-event-catalog-source'
import type { ObserveConnectionDetectionPhase } from './ports/observe-connection-detection-phase'
import { CodeExtractionModules } from './ports/code-extraction-modules'
import { RiviereModule } from './riviere-module'
import {
  ExtractionConfigurationUnavailableError,
  GraphStateUnavailableError,
} from './riviere-project-errors'
import { Workflow, WorkflowRunMode } from './workflow'
import type { WorkflowDiagnostic } from './workflow-diagnostic'
import {
  ExtractionProjectStartInput,
  GraphOnlyProjectStartInput,
  GraphWithWorkflowStartInput,
  type WorkflowStartInput,
} from './riviere-project-start-inputs'
import type { WorkflowStageValue } from './workflow-stage'

type RiviereProjectStartInput =
  | ExtractionProjectStartInput
  | GraphOnlyProjectStartInput
  | GraphWithWorkflowStartInput

export type {
  RiviereProjectCollaborators,
  RiviereProjectRepositoryCollaborators,
} from './ports/load-event-catalog-source'
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
    const modules = RiviereModule.fromConfiguration(
      input.configuration,
      input.draftComponents,
      collaborators.moduleExtractionRules,
    )
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
    if (!mode.isDryRun() && !mode.isSkipAi()) {
      for (const command of workflow.aiCliCommands()) {
        const availability = await this.collaborators.aiCli.checkAvailability(command)
        if (availability.kind !== 'unavailable') continue
        this.builder = previousBuilder
        return {
          success: false as const,
          errorCode: 'AI_CLI_UNAVAILABLE',
          reason: availability.reason,
          events: [],
          transitions: [],
          warnings: [],
        }
      }
    }
    const run = await workflow.run(this.builder, mode, (stage, context) =>
      this.executeWorkflowStage(stage, context.diagnostics, mode),
    )
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
      prompts: run.value.prompts,
    }
  }
  private async executeWorkflowStage(
    stage: WorkflowStageValue,
    unresolvedDiagnostics: readonly WorkflowDiagnostic[],
    mode: WorkflowRunMode,
  ) {
    switch (stage.kind) {
      case 'schema-validate': {
        const validation = this.graphBuilder().validate()
        if (!validation.valid)
          return {
            success: false as const,
            errorCode: 'GRAPH_VALIDATION_FAILED',
            reason: [
              ...validation.errors.map((error) => error.message),
              ...unresolvedDiagnostics.map((diagnostic) => diagnostic.describe()),
            ].join('\n'),
          }
        if (unresolvedDiagnostics.length > 0)
          return {
            success: false as const,
            errorCode: 'UNRESOLVED_WORKFLOW_DIAGNOSTICS',
            reason: `Unresolved workflow diagnostics: ${unresolvedDiagnostics
              .map((diagnostic) => diagnostic.describe())
              .join(', ')}`,
          }
        return { success: true as const, diagnostics: [], warnings: [] }
      }
      case 'eventcatalog-import':
        return this.collaborators.extractionBehaviour.executeEventCatalogImportStage(
          this.graphBuilder(),
          stage.config,
          this.collaborators,
        )
      case 'asyncapi-import':
        return this.collaborators.extractionBehaviour.executeAsyncApiImportStage(
          this.graphBuilder(),
          stage.config,
          this.collaborators,
        )
      case 'code-extraction':
        return this.executeCodeExtractionStage(stage)
      case 'ai-extract':
        return this.collaborators.extractionBehaviour.executeAiExtractStage(
          this.graphBuilder(),
          stage.config,
          this.collaborators,
          mode,
          unresolvedDiagnostics,
        )
      case 'ai-enrich':
        return this.executeAiStage(stage.kind, mode)
    }
  }

  private executeAiStage(stageKind: 'ai-enrich', mode: WorkflowRunMode) {
    if (mode.isDryRun()) return this.aiStageUnavailable(stageKind)
    return this.aiStageUnavailable(stageKind)
  }
  private executeCodeExtractionStage(
    stage: Extract<WorkflowStageValue, { kind: 'code-extraction' }>,
  ) {
    try {
      const extraction = ExtractionConfiguration.fromCodeExtractionStage(
        stage.config,
        stage.configPath,
        this.collaborators,
      )
      const modules = RiviereModule.fromConfiguration(
        extraction,
        [],
        this.collaborators.moduleExtractionRules,
      )
      modules.forEach((module) => module.extractAllDraftComponents())
      const completion = this.extractFrom(extraction, modules, {})
      if (completion.kind === 'fieldFailure') {
        return {
          success: false as const,
          errorCode: 'EXTRACTION_FIELD_FAILURE',
          reason: `Extraction failed for fields: ${completion.failedFields.join(', ')}`,
        }
      }
      const warnings = this.collaborators.extractionBehaviour.applyCodeExtractionToBuilder(
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
  extractDraftComponents(options: {
    sourceFileSelection?:
      | { readonly kind: 'all' }
      | { readonly kind: 'files'; readonly filePaths: readonly string[] }
    allowIncomplete?: boolean
    includeConnections: boolean
    observeConnectionDetectionPhase?: ObserveConnectionDetectionPhase
  }) {
    this.extractionConfiguration().assertEveryModuleHasSource(this.modules)
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
    this.extractionConfiguration().assertEveryModuleHasSource(this.modules)
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
    RiviereModule.assertNoUnassignedDomains(this.unassignedDraftComponents, this.modules)
    const completion = this.collaborators.extractionBehaviour.extractCodeExtraction({
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
      components: this.collaborators.extractionBehaviour.stripResolvedCustomTypes(
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
    const behaviour = this.collaborators.extractionBehaviour
    return behaviour.detectCodeExtractionConnections({
      extraction: configuration,
      modules,
      components: enrichedComponents,
      allowIncomplete,
      ...(observeConnectionDetectionPhase === undefined ? {} : { observeConnectionDetectionPhase }),
      detectEventPublisherConnections: behaviour.detectEventPublisherConnections,
      detectSubscribeConnections: behaviour.detectSubscribeConnections,
      detectConnectionsFromCalls: behaviour.detectConnectionsFromCalls,
      resolveHttpLinks: behaviour.resolveHttpLinks,
    })
  }
  private extractionConfiguration(): ExtractionConfiguration {
    if (this.configuration === undefined) {
      throw new ExtractionConfigurationUnavailableError()
    }
    return this.configuration
  }
  private aiStageUnavailable(stageKind: 'ai-enrich') {
    return {
      success: false as const,
      errorCode: 'STAGE_BEHAVIOUR_UNAVAILABLE',
      reason: `Stage behaviour is unavailable for '${stageKind}'`,
    }
  }

  private graphBuilder(): RiviereBuilder {
    if (this.builder === undefined) {
      throw new GraphStateUnavailableError()
    }
    return this.builder
  }
}
