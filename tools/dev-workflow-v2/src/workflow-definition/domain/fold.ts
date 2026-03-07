import type { WorkflowEvent } from './workflow-events'
import type { WorkflowState } from './workflow-types'

export const EMPTY_STATE: WorkflowState = {
  currentStateMachineState: 'IMPLEMENTING',
  architectureReviewPassed: false,
  codeReviewPassed: false,
  bugScannerPassed: false,
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
    ...(event.stateOverrides ?? {}),
    currentStateMachineState: event.to,
    preBlockedState: newPreBlockedState,
  }
}

function applyRecordingEvent(state: WorkflowState, event: WorkflowEvent): WorkflowState {
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
    case 'architecture-review-completed':
      return {
        ...state,
        architectureReviewPassed: event.passed,
      }
    case 'code-review-completed':
      return {
        ...state,
        codeReviewPassed: event.passed,
      }
    case 'bug-scanner-completed':
      return {
        ...state,
        bugScannerPassed: event.passed,
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
        feedbackUnresolvedCount: event.unresolvedCount,
      }
    case 'feedback-addressed':
      return {
        ...state,
        feedbackAddressed: true,
        feedbackAddressedCount: event.addressedCount,
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
    default:
      return state
  }
}

export function applyEvent(state: WorkflowState, event: WorkflowEvent): WorkflowState {
  if (event.type === 'transitioned') return applyTransitioned(state, event)
  return applyRecordingEvent(state, event)
}

export function applyEvents(events: readonly WorkflowEvent[]): WorkflowState {
  return events.reduce(applyEvent, EMPTY_STATE)
}
