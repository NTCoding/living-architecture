import type { GitInfo, TransitionContext } from '@nt-ai-lab/deterministic-agent-workflow-dsl'
import type { WorkflowState } from './workflow-types'

type StateName = WorkflowState['currentStateMachineState']

interface WorkflowTransitionContextValues extends TransitionContext<WorkflowState, StateName> {
  readonly gitInfo: GitInfo
}

/** @riviere-role value-object */
export class WorkflowTransitionContext {
  declare private readonly brand: 'WorkflowTransitionContext'

  private constructor(
    readonly state: WorkflowState,
    readonly from: StateName,
    readonly to: StateName,
    readonly gitInfo: GitInfo,
  ) {}

  static from(values: WorkflowTransitionContextValues): WorkflowTransitionContext {
    return new WorkflowTransitionContext(values.state, values.from, values.to, values.gitInfo)
  }
}
