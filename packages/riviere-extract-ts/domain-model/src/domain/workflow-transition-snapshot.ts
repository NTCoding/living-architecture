import type {
  Component,
  ExternalLink,
  Link,
} from '@living-architecture/riviere-schema-published-language/schema'
import type { WorkflowDiagnostic } from './workflow-diagnostic'
import type { WorkflowStageValue } from './workflow-stage'

/** @riviere-role value-object */
export class WorkflowStateSnapshot {
  declare private readonly brand: 'WorkflowStateSnapshot'

  static from(input: {
    components: readonly Component[]
    diagnostics: readonly WorkflowDiagnostic[]
    externalLinks: readonly ExternalLink[]
    links: readonly Link[]
  }): WorkflowStateSnapshot {
    return new WorkflowStateSnapshot(
      input.components,
      input.diagnostics,
      input.externalLinks,
      input.links,
    )
  }

  private constructor(
    readonly components: readonly Component[],
    readonly diagnostics: readonly WorkflowDiagnostic[],
    readonly externalLinks: readonly ExternalLink[],
    readonly links: readonly Link[],
  ) {}
}

type WorkflowTransitionSnapshotValue =
  | Readonly<{ kind: 'initial'; state: WorkflowStateSnapshot }>
  | Readonly<{
      kind: 'stage-completed'
      stageIndex: number
      stageKind: WorkflowStageValue['kind']
      stageName: string
      state: WorkflowStateSnapshot
    }>

/** @riviere-role value-object */
export class WorkflowTransitionSnapshot {
  declare private readonly brand: 'WorkflowTransitionSnapshot'

  static fromInitial(state: WorkflowStateSnapshot): WorkflowTransitionSnapshot {
    return new WorkflowTransitionSnapshot({ kind: 'initial', state })
  }

  static fromCompletedStage(
    stage: WorkflowStageValue,
    stageIndex: number,
    state: WorkflowStateSnapshot,
  ): WorkflowTransitionSnapshot {
    return new WorkflowTransitionSnapshot({
      kind: 'stage-completed',
      stageIndex,
      stageKind: stage.kind,
      stageName: stage.name,
      state,
    })
  }

  private constructor(readonly value: WorkflowTransitionSnapshotValue) {}
}

export type { WorkflowTransitionSnapshotValue }
