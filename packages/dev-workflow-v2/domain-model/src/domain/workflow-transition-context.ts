import type { GitInfo, TransitionContext } from '@nt-ai-lab/deterministic-agent-workflow-dsl'
import { type WorkflowStateNameValue, type WorkflowState } from './workflow-types'

interface WorkflowTransitionContextValues extends TransitionContext<
  WorkflowState,
  WorkflowStateNameValue
> {
  readonly gitInfo: GitInfo
}

/** @riviere-role value-object */
export class WorkflowTransitionContext {
  declare private readonly brand: 'WorkflowTransitionContext'

  private constructor(
    readonly state: WorkflowState,
    readonly from: WorkflowStateNameValue,
    readonly to: WorkflowStateNameValue,
    readonly gitInfo: GitInfo,
  ) {}

  static from(values: WorkflowTransitionContextValues): WorkflowTransitionContext {
    return new WorkflowTransitionContext(values.state, values.from, values.to, values.gitInfo)
  }
}
