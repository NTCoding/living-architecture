import type {
  ConcreteStateDefinition, WorkflowState 
} from '../workflow-types'
import {
  pass, fail 
} from '@ntcoding/agentic-workflow-builder/dsl'

export const implementingState: ConcreteStateDefinition = {
  emoji: '🔨',
  agentInstructions: 'states/implementing.md',
  canTransitionTo: ['REVIEWING', 'BLOCKED'],
  allowedWorkflowOperations: ['record-issue', 'record-branch'],
  forbidden: { write: true },

  transitionGuard: (ctx) => {
    /* v8 ignore next */
    if (ctx.to === 'BLOCKED') return pass()
    if (!ctx.gitInfo.hasCommitsVsDefault)
      return fail('No commits beyond default branch. Write code and commit before reviewing.')
    if (!ctx.gitInfo.workingTreeClean)
      return fail('Working tree is not clean. Commit all changes before transitioning.')
    if (!ctx.state.githubIssue) return fail('No issue recorded. Run record-issue first.')
    return pass()
  },

  onEntry: (state: WorkflowState): WorkflowState => ({
    ...state,
    architectureReviewPassed: false,
    codeReviewPassed: false,
    bugScannerPassed: false,
    ciPassed: false,
    feedbackClean: false,
    feedbackAddressed: false,
  }),
}
