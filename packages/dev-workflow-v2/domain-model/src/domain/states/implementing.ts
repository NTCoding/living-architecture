import type {
  PreconditionResult,
  TransitionContext,
} from '@nt-ai-lab/deterministic-agent-workflow-dsl'
import { z } from 'zod'
import type { WorkflowState } from '../workflow-types'

type StateName = WorkflowState['currentStateMachineState']

/** @riviere-role value-object */
export class ImplementingState {
  declare private readonly brand: 'ImplementingState'

  readonly name: 'IMPLEMENTING'
  readonly emoji = '🔨'
  readonly agentInstructions = 'states/implementing.md'
  readonly canTransitionTo = ['REVIEWING', 'BLOCKED'] as const
  readonly allowedWorkflowOperations = ['record-issue', 'record-branch'] as const
  readonly forbidden = { write: true } as const

  private constructor(name: 'IMPLEMENTING') {
    this.name = name
  }

  static parse(value: unknown): ImplementingState {
    z.literal('IMPLEMENTING').parse(value)
    return new ImplementingState('IMPLEMENTING')
  }

  transitionGuard(context: TransitionContext<WorkflowState, StateName>): PreconditionResult {
    if (context.to === 'BLOCKED') return { pass: true }
    if (!context.gitInfo.hasCommitsVsDefault) {
      return {
        pass: false,
        reason: 'No commits beyond default branch. Write code and commit before reviewing.',
      }
    }
    if (!context.gitInfo.workingTreeClean) {
      return {
        pass: false,
        reason: 'Working tree is not clean. Commit all changes before transitioning.',
      }
    }
    if (!context.state.githubIssue) {
      return { pass: false, reason: 'No issue recorded. Run record-issue first.' }
    }
    return { pass: true }
  }

  onEntry(state: WorkflowState): WorkflowState {
    return state.with({
      architectureReviewPassed: false,
      codeReviewPassed: false,
      bugScannerPassed: false,
      taskCheckPassed: false,
      ciPassed: false,
      feedbackClean: false,
      feedbackAddressed: false,
    })
  }
}
