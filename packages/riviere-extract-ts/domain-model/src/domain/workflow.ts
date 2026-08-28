import {
  ComponentDefinition,
  type OperationWarning,
  RiviereBuilder,
} from '@living-architecture/riviere-builder-published-language'
import type { ConnectionDetectionResult } from './connection-detection/connection-detection-result'
import type { ExtractionConfiguration } from './extraction-configuration'
import type { EnrichedComponent } from './value-extraction/enriched-component'
import { WorkflowDefinitionFailure } from './workflow-definition-failure'
import { WorkflowRunEvent } from './workflow-run-event'
import type { WorkflowStage, WorkflowStageValue } from './workflow-stage'

type WorkflowState = 'ready' | 'running' | 'completed' | 'failed'

type WorkflowStageExecutionResult =
  | Readonly<{
      success: true
      extractedComponents?: readonly EnrichedComponent[]
      warnings: readonly OperationWarning[]
    }>
  | Readonly<{
      success: false
      errorCode: string
      reason: string
    }>

type WorkflowStagePreparationResult =
  | Readonly<{
      success: true
      kind: 'components'
      components: readonly EnrichedComponent[]
      repository: string
    }>
  | Readonly<{
      success: true
      kind: 'connections'
      connections: ConnectionDetectionResult
    }>
  | Readonly<{ success: false; errorCode: string; reason: string }>

type WorkflowRunResult =
  | Readonly<{
      success: true
      events: readonly WorkflowRunEvent[]
      warnings: readonly OperationWarning[]
    }>
  | Readonly<{
      success: false
      errorCode: string
      reason: string
      events: readonly WorkflowRunEvent[]
      warnings: readonly OperationWarning[]
    }>

type WorkflowStartResult =
  | Readonly<{ success: true; data: Workflow }>
  | Readonly<{ success: false; error: WorkflowDefinitionFailure }>

type ExecuteWorkflowStage = (
  stage: Exclude<WorkflowStageValue, { kind: 'validate' }>,
  accumulatedComponents: readonly EnrichedComponent[],
) => WorkflowStagePreparationResult

/** @riviere-role aggregate-entity */
export class Workflow {
  private state: WorkflowState = 'ready'
  private runEvents: WorkflowRunEvent[] = []
  private runWarnings: OperationWarning[] = []
  private accumulatedComponents: EnrichedComponent[] = []

  static start(input: {
    name: string
    outputPath: string
    runLogDirectory: string
    stages: readonly WorkflowStage[]
  }): WorkflowStartResult {
    const failure = validateWorkflow(input.name, input.stages)
    if (failure !== undefined) return { success: false, error: failure }
    return {
      success: true,
      data: new Workflow(input.name, input.outputPath, input.runLogDirectory, input.stages),
    }
  }

  private constructor(
    private readonly workflowName: string,
    private readonly graphOutputPath: string,
    private readonly logDirectory: string,
    private readonly stages: readonly WorkflowStage[],
  ) {}

  name(): string {
    return this.workflowName
  }

  outputPath(): string {
    return this.graphOutputPath
  }

  runLogDirectory(): string {
    return this.logDirectory
  }

  status(): WorkflowState {
    return this.state
  }

  configurations(): readonly ExtractionConfiguration[] {
    return this.stages.flatMap((stage) =>
      stage.value.kind === 'validate' ? [] : [stage.value.configuration],
    )
  }

  run(builder: RiviereBuilder, execute: ExecuteWorkflowStage): WorkflowRunResult {
    this.startRun()
    this.defineCustomTypes(builder)
    for (const [index, stage] of this.stages.entries()) {
      const values = stageEventValues(stage.value, index)
      this.runEvents.push(WorkflowRunEvent.fromStage('StageStarted', values))
      const result = this.executeStage(builder, execute, stage.value)
      if (!result.success) return this.failRun(values, result)
      this.recordStageSuccess(stage.value, values, result)
    }
    this.state = 'completed'
    this.runEvents.push(WorkflowRunEvent.fromWorkflow('WorkflowCompleted'))
    return { success: true, events: [...this.runEvents], warnings: [...this.runWarnings] }
  }

  private startRun(): void {
    this.state = 'running'
    this.runEvents = [WorkflowRunEvent.fromWorkflow('WorkflowStarted')]
    this.runWarnings = []
    this.accumulatedComponents = []
  }

  private executeStage(
    builder: RiviereBuilder,
    execute: ExecuteWorkflowStage,
    stage: WorkflowStageValue,
  ): WorkflowStageExecutionResult {
    try {
      if (stage.kind === 'validate') return validateGraph(builder)
      const prepared = execute(stage, this.accumulatedComponents)
      if (!prepared.success) return prepared
      return prepared.kind === 'components'
        ? applyComponents(builder, prepared.components, prepared.repository)
        : applyConnections(builder, prepared.connections)
    } catch (error) {
      return {
        success: false,
        errorCode: 'UNEXPECTED_STAGE_FAILURE',
        reason: error instanceof Error ? error.message : String(error),
      }
    }
  }

  private defineCustomTypes(builder: RiviereBuilder): void {
    const names = new Set(
      this.configurations().flatMap((configuration) =>
        configuration.resolvedConfig.modules.flatMap((module) =>
          Object.keys(module.customTypes ?? {}),
        ),
      ),
    )
    for (const name of names) builder.defineCustomType({ name })
  }

  private recordStageSuccess(
    stage: WorkflowStageValue,
    values: WorkflowStageEventValues,
    result: Extract<WorkflowStageExecutionResult, { success: true }>,
  ): void {
    if (stage.kind === 'extract' && result.extractedComponents !== undefined) {
      this.accumulatedComponents.push(...result.extractedComponents)
    }
    this.runWarnings.push(...result.warnings)
    this.runEvents.push(WorkflowRunEvent.fromStage('StageCompleted', values))
  }

  private failRun(
    values: WorkflowStageEventValues,
    failure: Extract<WorkflowStageExecutionResult, { success: false }>,
  ): WorkflowRunResult {
    this.state = 'failed'
    this.runEvents.push(
      WorkflowRunEvent.fromStageFailure(values, failure.reason, failure.errorCode),
      WorkflowRunEvent.fromWorkflowFailure(failure.reason, failure.errorCode),
    )
    return {
      success: false,
      errorCode: failure.errorCode,
      reason: failure.reason,
      events: [...this.runEvents],
      warnings: [...this.runWarnings],
    }
  }
}

type WorkflowStageEventValues = Readonly<{
  name: string
  kind: WorkflowStageValue['kind']
  index: number
}>

function stageEventValues(stage: WorkflowStageValue, index: number): WorkflowStageEventValues {
  return { name: stage.name, kind: stage.kind, index }
}

function validateWorkflow(
  name: string,
  stages: readonly WorkflowStage[],
): WorkflowDefinitionFailure | undefined {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) {
    return WorkflowDefinitionFailure.parse(
      'INVALID_WORKFLOW_NAME',
      `Workflow name '${name}' must match [a-z0-9][a-z0-9-]*`,
    )
  }
  const duplicateName = findDuplicateStageName(stages)
  if (duplicateName !== undefined) {
    return WorkflowDefinitionFailure.parse(
      'DUPLICATE_STAGE_NAME',
      `Duplicate workflow stage name '${duplicateName}'`,
    )
  }
  if (!hasValidStageOrder(stages)) {
    return WorkflowDefinitionFailure.parse(
      'INVALID_STAGE_ORDER',
      'Workflow stages must contain one or more extract stages, followed by one link stage and one validate stage',
    )
  }
  return undefined
}

function findDuplicateStageName(stages: readonly WorkflowStage[]): string | undefined {
  const names = new Set<string>()
  for (const stage of stages) {
    if (names.has(stage.value.name)) return stage.value.name
    names.add(stage.value.name)
  }
  return undefined
}

function hasValidStageOrder(stages: readonly WorkflowStage[]): boolean {
  if (stages.length < 3) return false
  const linkStage = stages.at(-2)
  const validateStage = stages.at(-1)
  if (linkStage?.value.kind !== 'link' || validateStage?.value.kind !== 'validate') return false
  return stages.slice(0, -2).every((stage) => stage.value.kind === 'extract')
}

function validateGraph(builder: RiviereBuilder): WorkflowStageExecutionResult {
  const validation = builder.validate()
  return validation.valid
    ? { success: true, warnings: [] }
    : {
        success: false,
        errorCode: 'GRAPH_VALIDATION_FAILED',
        reason: validation.errors.map((error) => error.message).join('\n'),
      }
}

function applyComponents(
  builder: RiviereBuilder,
  components: readonly EnrichedComponent[],
  repository: string,
): WorkflowStageExecutionResult {
  const warnings: OperationWarning[] = []
  for (const component of components) {
    const parsed = component.toComponentDefinition(repository)
    if (!parsed.success) {
      return {
        success: false,
        errorCode: 'GRAPH_APPLICATION_FAILED',
        reason: `${component.type}:${component.name}: ${parsed.message}`,
      }
    }
    warnings.push(...upsertComponent(builder, parsed.data.value))
  }
  return { success: true, extractedComponents: components, warnings }
}

function upsertComponent(
  builder: RiviereBuilder,
  definition: ComponentDefinition['value'],
): readonly OperationWarning[] {
  switch (definition.type) {
    case 'UI':
      return builder.upsertUI(definition.input).warnings
    case 'API':
      return builder.upsertApi(definition.input).warnings
    case 'UseCase':
      return builder.upsertUseCase(definition.input).warnings
    case 'DomainOp':
      return builder.upsertDomainOp(definition.input).warnings
    case 'Event':
      return builder.upsertEvent(definition.input).warnings
    case 'EventHandler':
      return builder.upsertEventHandler(definition.input).warnings
    case 'Custom':
      return builder.upsertCustom(definition.input).warnings
  }
}

function applyConnections(
  builder: RiviereBuilder,
  connections: ConnectionDetectionResult,
): WorkflowStageExecutionResult {
  const warnings: OperationWarning[] = []
  for (const link of connections.links) {
    builder.link({
      from: link.source,
      to: link.target,
      ...(link.type === undefined ? {} : { type: link.type }),
      ...(link.sourceLocation === undefined ? {} : { sourceLocation: link.sourceLocation }),
    })
  }
  for (const link of connections.externalLinks) {
    const result = builder.linkExternal({
      from: link.source,
      target: link.target,
      ...(link.type === undefined ? {} : { type: link.type }),
      ...(link.description === undefined ? {} : { description: link.description }),
      ...(link.sourceLocation === undefined ? {} : { sourceLocation: link.sourceLocation }),
    })
    warnings.push(...result.warnings)
  }
  return { success: true, warnings }
}
