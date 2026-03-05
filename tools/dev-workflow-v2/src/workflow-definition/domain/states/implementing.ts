import type {
  ConcreteStateDefinition, WorkflowState 
} from '../workflow-types'
import {
  pass, fail 
} from '@ntcoding/agentic-workflow-builder/dsl'

export const implementingState: ConcreteStateDefinition = {
  emoji: '🔨',
  agentInstructions: 'states/implementing.md',
  canTransitionTo: ['VERIFYING', 'BLOCKED'],
  allowedWorkflowOperations: ['record-issue', 'record-branch'],

  transitionGuard: (ctx) => {
    if (!ctx.gitInfo.hasCommitsVsDefault)
      return fail('No commits beyond default branch. Write code and commit before verifying.')
    return pass()
  },

  onEntry: (state: WorkflowState): WorkflowState => ({
    ...state,
    verifyPassed: false,
    reviewPassed: false,
    ciPassed: false,
    feedbackClean: false,
    feedbackAddressed: false,
  }),
}
