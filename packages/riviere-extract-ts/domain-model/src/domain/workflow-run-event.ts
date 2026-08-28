type WorkflowRunEventType =
  | 'WorkflowStarted'
  | 'StageStarted'
  | 'StageCompleted'
  | 'StageFailed'
  | 'WorkflowCompleted'
  | 'WorkflowFailed'

/** @riviere-role value-object */
export class WorkflowRunEvent {
  declare private readonly brand: 'WorkflowRunEvent'

  static fromWorkflow(type: 'WorkflowStarted' | 'WorkflowCompleted'): WorkflowRunEvent {
    return new WorkflowRunEvent(type)
  }

  static fromWorkflowFailure(reason: string, errorCode: string): WorkflowRunEvent {
    return new WorkflowRunEvent('WorkflowFailed', undefined, undefined, undefined, {
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
      reason,
      errorCode,
    })
  }

  private constructor(
    readonly type: WorkflowRunEventType,
    readonly stageName?: string,
    readonly stageType?: 'extract' | 'link' | 'validate',
    readonly stageIndex?: number,
    readonly failure?: Readonly<{ reason: string; errorCode: string }>,
  ) {}
}

type WorkflowStageEventValues = Readonly<{
  name: string
  kind: 'extract' | 'link' | 'validate'
  index: number
}>
