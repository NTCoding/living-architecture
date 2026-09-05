import {
  type OperationWarning,
  RiviereBuilder,
} from '@living-architecture/riviere-builder-published-language'
import type { CodeExtractionConfig } from '@living-architecture/riviere-extract-config-published-language'
import { WorkflowDefinitionFailure } from './workflow-definition-failure'
import type { WorkflowDiagnostic } from './workflow-diagnostic'
import { WorkflowRunEvent } from './workflow-run-event'
import type { WorkflowStage, WorkflowStageValue } from './workflow-stage'
import { WorkflowStateSnapshot, WorkflowTransitionSnapshot } from './workflow-transition-snapshot'

type WorkflowState = 'ready' | 'running' | 'completed' | 'failed'

type WorkflowRunModeValue = 'run' | 'skip-ai' | 'dry-run'

/** @riviere-role value-object */
export class WorkflowRunMode {
  declare private readonly brand: 'WorkflowRunMode'

  static from(value: WorkflowRunModeValue): WorkflowRunMode {
    return new WorkflowRunMode(value)
  }

  private constructor(readonly value: WorkflowRunModeValue) {}
}

type WorkflowStageExecutionResult =
  | Readonly<{
      success: true
      diagnostics: readonly WorkflowDiagnostic[]
      warnings: readonly OperationWarning[]
    }>
  | Readonly<{
      success: false
      errorCode: string
      reason: string
    }>

type WorkflowRunResultValue =
  | Readonly<{
      success: true
      events: readonly WorkflowRunEvent[]
      transitions: readonly WorkflowTransitionSnapshot[]
      warnings: readonly OperationWarning[]
    }>
  | Readonly<{
      success: false
      errorCode: string
      reason: string
      events: readonly WorkflowRunEvent[]
      transitions: readonly WorkflowTransitionSnapshot[]
      warnings: readonly OperationWarning[]
    }>

/** @riviere-role value-object */
export class WorkflowRunResult {
  declare private readonly brand: 'WorkflowRunResult'

  static from(value: WorkflowRunResultValue): WorkflowRunResult {
    return new WorkflowRunResult(value)
  }

  private constructor(readonly value: WorkflowRunResultValue) {}
}

type WorkflowStartResult =
  | Readonly<{ success: true; data: Workflow }>
  | Readonly<{ success: false; error: WorkflowDefinitionFailure }>

type WorkflowStageContext = Readonly<{
  components: ReturnType<RiviereBuilder['components']>
  diagnostics: readonly WorkflowDiagnostic[]
}>

type ExecuteWorkflowStage = (
  stage: WorkflowStageValue,
  context: WorkflowStageContext,
) => WorkflowStageExecutionResult

/** @riviere-role aggregate-entity */
export class Workflow {
  private state: WorkflowState = 'ready'
  private runEvents: WorkflowRunEvent[] = []
  private runWarnings: OperationWarning[] = []
  private runDiagnostics: WorkflowDiagnostic[] = []
  private runTransitions: WorkflowTransitionSnapshot[] = []

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

  configurations(): readonly CodeExtractionConfig[] {
    return this.stages.flatMap((stage) =>
      stage.value.kind === 'code-extraction' ? [stage.value.config] : [],
    )
  }

  run(
    builder: RiviereBuilder,
    mode: WorkflowRunMode,
    execute: ExecuteWorkflowStage,
  ): WorkflowRunResult {
    this.startRun(builder)
    const activeStages = this.activeStages(mode.value)
    for (const [index, stage] of activeStages.entries()) {
      const values = stageEventValues(stage.value, index)
      this.runEvents.push(WorkflowRunEvent.fromStage('StageStarted', values))
      const result = this.executeStage(execute, stage.value, builder)
      if (!result.success) return this.failRun(values, result)
      this.recordStageSuccess(stage.value, values, result, builder, index)
    }
    this.state = 'completed'
    this.runEvents.push(WorkflowRunEvent.fromWorkflow('WorkflowCompleted'))
    return this.successResult()
  }

  private activeStages(mode: WorkflowRunModeValue): readonly WorkflowStage[] {
    switch (mode) {
      case 'run':
      case 'dry-run':
        return this.stages
      case 'skip-ai':
        return this.stages.filter((stage) => !isAiStage(stage.value))
    }
  }

  private startRun(builder: RiviereBuilder): void {
    this.state = 'running'
    this.runEvents = [WorkflowRunEvent.fromWorkflow('WorkflowStarted')]
    this.runWarnings = []
    this.runDiagnostics = []
    this.runTransitions = [WorkflowTransitionSnapshot.fromInitial(this.snapshot(builder))]
  }

  private executeStage(
    execute: ExecuteWorkflowStage,
    stage: WorkflowStageValue,
    builder: RiviereBuilder,
  ): WorkflowStageExecutionResult {
    try {
      return execute(stage, {
        components: builder.components(),
        diagnostics: [...this.runDiagnostics],
      })
    } catch (error) {
      return {
        success: false,
        errorCode: 'UNEXPECTED_STAGE_FAILURE',
        reason: error instanceof Error ? error.message : String(error),
      }
    }
  }

  private recordStageSuccess(
    stage: WorkflowStageValue,
    values: WorkflowStageEventValues,
    result: Extract<WorkflowStageExecutionResult, { success: true }>,
    builder: RiviereBuilder,
    stageIndex: number,
  ): void {
    this.runWarnings.push(...result.warnings)
    this.runDiagnostics.push(...result.diagnostics)
    this.runEvents.push(WorkflowRunEvent.fromStage('StageCompleted', values))
    this.runTransitions.push(
      WorkflowTransitionSnapshot.fromCompletedStage(stage, stageIndex, this.snapshot(builder)),
    )
  }

  private snapshot(builder: RiviereBuilder): WorkflowStateSnapshot {
    return WorkflowStateSnapshot.from({
      components: builder.components(),
      diagnostics: [...this.runDiagnostics],
      externalLinks: builder.externalLinks(),
      links: builder.links(),
    })
  }

  private successResult(): WorkflowRunResult {
    return WorkflowRunResult.from({
      success: true,
      events: [...this.runEvents],
      transitions: [...this.runTransitions],
      warnings: [...this.runWarnings],
    })
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
    return WorkflowRunResult.from({
      success: false,
      errorCode: failure.errorCode,
      reason: failure.reason,
      events: [...this.runEvents],
      transitions: [...this.runTransitions],
      warnings: [...this.runWarnings],
    })
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

function isAiStage(stage: WorkflowStageValue): boolean {
  switch (stage.kind) {
    case 'ai-extract':
    case 'ai-enrich':
      return true
    case 'code-extraction':
    case 'eventcatalog-import':
    case 'asyncapi-import':
    case 'schema-validate':
      return false
  }
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
  if (duplicateName === undefined) return undefined
  return WorkflowDefinitionFailure.parse(
    'DUPLICATE_STAGE_NAME',
    `Duplicate workflow stage name '${duplicateName}'`,
  )
}

function findDuplicateStageName(stages: readonly WorkflowStage[]): string | undefined {
  const names = new Set<string>()
  for (const stage of stages) {
    if (names.has(stage.value.name)) return stage.value.name
    names.add(stage.value.name)
  }
  return undefined
}
