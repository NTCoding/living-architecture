import type { WorkflowDiagnostic } from './workflow-diagnostic'
import type { WorkflowStageValue } from './workflow-stage'

type WorkflowRunEventType =
  | 'WorkflowStarted'
  | 'StageStarted'
  | 'StageCompleted'
  | 'StageFailed'
  | 'WorkflowCompleted'
  | 'WorkflowFailed'
  | 'AiExtractCandidateAlreadyPresent'
  | 'DiagnosticResolved'

type WorkflowRunEventDetail =
  | Readonly<{ kind: 'failure'; reason: string; errorCode: string }>
  | Readonly<{ kind: 'candidate-already-present'; candidateId: string }>
  | Readonly<{ kind: 'diagnostic-resolved'; diagnostic: WorkflowDiagnostic }>

/** @riviere-role value-object */
export class WorkflowRunEvent {
  declare private readonly brand: 'WorkflowRunEvent'

  static fromWorkflow(type: 'WorkflowStarted' | 'WorkflowCompleted'): WorkflowRunEvent {
    return new WorkflowRunEvent(type)
  }

  static fromWorkflowFailure(reason: string, errorCode: string): WorkflowRunEvent {
    return new WorkflowRunEvent('WorkflowFailed', undefined, undefined, undefined, {
      kind: 'failure',
      reason,
      errorCode,
    })
  }

  static fromStage(
    type: 'StageStarted' | 'StageCompleted',
    stage: WorkflowStageEventValues,
  ): WorkflowRunEvent {
    return new WorkflowRunEvent(type, stage.name, stage.kind, stage.index)
  }

  static fromStageFailure(
    stage: WorkflowStageEventValues,
    reason: string,
    errorCode: string,
  ): WorkflowRunEvent {
    return new WorkflowRunEvent('StageFailed', stage.name, stage.kind, stage.index, {
      kind: 'failure',
      reason,
      errorCode,
    })
  }

  static fromCandidateAlreadyPresent(
    stage: WorkflowStageEventValues,
    candidateId: string,
  ): WorkflowRunEvent {
    return new WorkflowRunEvent(
      'AiExtractCandidateAlreadyPresent',
      stage.name,
      stage.kind,
      stage.index,
      { kind: 'candidate-already-present', candidateId },
    )
  }

  static fromDiagnosticResolved(
    stage: WorkflowStageEventValues,
    diagnostic: WorkflowDiagnostic,
  ): WorkflowRunEvent {
    return new WorkflowRunEvent('DiagnosticResolved', stage.name, stage.kind, stage.index, {
      kind: 'diagnostic-resolved',
      diagnostic,
    })
  }

  private constructor(
    readonly type: WorkflowRunEventType,
    readonly stageName?: string,
    readonly stageKind?: WorkflowStageValue['kind'],
    readonly stageIndex?: number,
    readonly detail?: WorkflowRunEventDetail,
  ) {}
}

type WorkflowStageEventValues = Readonly<{
  name: string
  kind: WorkflowStageValue['kind']
  index: number
}>

export type { WorkflowRunEventDetail, WorkflowRunEventType }
