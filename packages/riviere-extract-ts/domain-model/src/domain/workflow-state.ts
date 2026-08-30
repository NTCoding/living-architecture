import {
  type OperationWarning,
  RiviereBuilder,
} from '@living-architecture/riviere-builder-published-language'
import type { ExtractionConfiguration } from './extraction-configuration'
import type { EnrichedComponent } from './value-extraction/enriched-component'
import { WorkflowRunEvent } from './workflow-run-event'
import type { WorkflowStageValue } from './workflow-stage'

type WorkflowStatus = 'ready' | 'running' | 'completed' | 'failed'

type WorkflowStageEventValues = Readonly<{
  name: string
  kind: WorkflowStageValue['kind']
  index: number
}>

/**
 * @riviere-role value-object
 * @riviere-role-justification The state has no identity outside its owning Workflow. It contains the transient graph value for one run and is replaced on each workflow transition.
 */
export class WorkflowState {
  declare private readonly brand: 'WorkflowState'

  static fromBuilder(builder: RiviereBuilder): WorkflowState {
    return new WorkflowState('running', builder.fresh(), [
      WorkflowRunEvent.fromWorkflow('WorkflowStarted'),
    ])
  }

  private constructor(
    private readonly currentStatus: WorkflowStatus,
    private readonly intermediateBuilder: RiviereBuilder,
    private readonly runEvents: readonly WorkflowRunEvent[],
    private readonly runWarnings: readonly OperationWarning[] = [],
    private readonly components: readonly EnrichedComponent[] = [],
    private readonly extractions: readonly ExtractionConfiguration[] = [],
  ) {}

  status(): WorkflowStatus {
    return this.currentStatus
  }

  builder(): RiviereBuilder {
    return this.intermediateBuilder
  }

  accumulatedComponents(): readonly EnrichedComponent[] {
    return this.components
  }

  executedExtractions(): readonly ExtractionConfiguration[] {
    return this.extractions
  }

  events(): readonly WorkflowRunEvent[] {
    return this.runEvents
  }

  warnings(): readonly OperationWarning[] {
    return this.runWarnings
  }

  startStage(values: WorkflowStageEventValues): WorkflowState {
    return this.withEvents(WorkflowRunEvent.fromStage('StageStarted', values))
  }

  completeStage(
    stage: WorkflowStageValue,
    values: WorkflowStageEventValues,
    extractedComponents: readonly EnrichedComponent[] | undefined,
    warnings: readonly OperationWarning[],
  ): WorkflowState {
    const completedExtractions =
      stage.kind === 'extract' && extractedComponents !== undefined
        ? [...this.extractions, stage.configuration]
        : this.extractions
    const accumulatedComponents =
      stage.kind === 'extract' && extractedComponents !== undefined
        ? [...this.components, ...extractedComponents]
        : this.components
    return new WorkflowState(
      this.currentStatus,
      this.intermediateBuilder,
      [...this.runEvents, WorkflowRunEvent.fromStage('StageCompleted', values)],
      [...this.runWarnings, ...warnings],
      accumulatedComponents,
      completedExtractions,
    )
  }

  fail(values: WorkflowStageEventValues, reason: string, errorCode: string): WorkflowState {
    return new WorkflowState(
      'failed',
      this.intermediateBuilder,
      [
        ...this.runEvents,
        WorkflowRunEvent.fromStageFailure(values, reason, errorCode),
        WorkflowRunEvent.fromWorkflowFailure(reason, errorCode),
      ],
      this.runWarnings,
      this.components,
      this.extractions,
    )
  }

  complete(): WorkflowState {
    return new WorkflowState(
      'completed',
      this.intermediateBuilder,
      [...this.runEvents, WorkflowRunEvent.fromWorkflow('WorkflowCompleted')],
      this.runWarnings,
      this.components,
      this.extractions,
    )
  }

  private withEvents(event: WorkflowRunEvent): WorkflowState {
    return new WorkflowState(
      this.currentStatus,
      this.intermediateBuilder,
      [...this.runEvents, event],
      this.runWarnings,
      this.components,
      this.extractions,
    )
  }
}

export type { WorkflowStatus }
