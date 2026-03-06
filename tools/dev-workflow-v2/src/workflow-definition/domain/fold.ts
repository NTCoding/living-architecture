import type { WorkflowEvent } from './workflow-events'
import type { WorkflowState } from './workflow-types'

export const EMPTY_STATE: WorkflowState = {
  currentStateMachineState: 'IMPLEMENTING',
  verifyPassed: false,
  reviewPassed: false,
  taskCheckPassed: false,
  ciPassed: false,
  feedbackClean: false,
  feedbackAddressed: false,
}

function applyTransitioned(
  state: WorkflowState,
  event: Extract<WorkflowEvent, { type: 'transitioned' }>,
): WorkflowState {
  const newPreBlockedState = event.to === 'BLOCKED' ? event.from : undefined
  return {
    ...state,
    currentStateMachineState: event.to,
    preBlockedState: newPreBlockedState,
  }
}

export function applyEvent(state: WorkflowState, event: WorkflowEvent): WorkflowState {
  if (event.type === 'transitioned') return applyTransitioned(state, event)

  switch (event.type) {
    case 'issue-recorded':
      return {
        ...state,
        githubIssue: event.issueNumber,
      }
    case 'branch-recorded':
      return {
        ...state,
        featureBranch: event.branch,
      }
    case 'verify-completed':
      return {
        ...state,
        verifyPassed: event.passed,
      }
    case 'review-completed':
      return {
        ...state,
        reviewPassed: event.passed,
      }
    case 'pr-recorded':
      return {
        ...state,
        prNumber: event.prNumber,
        prUrl: event.prUrl,
      }
    case 'ci-completed':
      return {
        ...state,
        ciPassed: event.passed,
      }
    case 'feedback-checked':
      return {
        ...state,
        feedbackClean: event.clean,
      }
    case 'feedback-addressed':
      return {
        ...state,
        feedbackAddressed: true,
      }
    case 'reflection-written':
      return {
        ...state,
        reflectionPath: event.path,
      }
    case 'task-check-passed':
      return {
        ...state,
        taskCheckPassed: true,
      }
  }

  return state
}

export function applyEvents(events: readonly WorkflowEvent[]): WorkflowState {
  return events.reduce(applyEvent, EMPTY_STATE)
}
