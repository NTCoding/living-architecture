import type { WorkflowEvent } from './workflow-events'
import {
  LIVING_ARCHITECTURE_REVIEW_TYPE_SCHEMA, type WorkflowState 
} from './workflow-types'

function applyRecordedReviewVerdict(
  state: WorkflowState,
  event: Extract<WorkflowEvent, { type: 'review-recorded' }>,
): WorkflowState {
  const parsedReviewType = LIVING_ARCHITECTURE_REVIEW_TYPE_SCHEMA.safeParse(event.reviewType)
  if (!parsedReviewType.success) {
    return state
  }

  const passed = event.verdict === 'PASS'

  switch (parsedReviewType.data) {
    case 'architecture-review':
      return {
        ...state,
        architectureReviewPassed: passed,
      }
    case 'code-review':
      return {
        ...state,
        codeReviewPassed: passed,
      }
    case 'bug-scanner':
      return {
        ...state,
        bugScannerPassed: passed,
      }
    case 'task-check':
      return {
        ...state,
        taskCheckPassed: passed,
      }
  }
}

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

function applyReviewEvent(state: WorkflowState, event: WorkflowEvent): WorkflowState | undefined {
  switch (event.type) {
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
      }
    case 'review-recorded':
      return applyRecordedReviewVerdict(state, event)
  }
}

function applyRecordingEvent(state: WorkflowState, event: WorkflowEvent): WorkflowState {
  const reviewResult = applyReviewEvent(state, event)
  if (reviewResult !== undefined) return reviewResult
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
    case 'pr-recorded':
      return {
        ...state,
        prNumber: event.prNumber,
        prUrl: event.prUrl,
      }
    case 'task-check-passed':
      return {
        ...state,
        taskCheckPassed: true,
      }
    case 'session-started':
      return {
        ...state,
        ...(event.transcriptPath === undefined ? {} : { transcriptPath: event.transcriptPath }),
      }
    default:
      return state
  }
}

/** @riviere-role domain-service */
export function applyEvent(state: WorkflowState, event: WorkflowEvent): WorkflowState {
  if (event.type === 'transitioned') return applyTransitioned(state, event)
  return applyRecordingEvent(state, event)
}

/** @riviere-role domain-service */
export function applyEvents(events: readonly WorkflowEvent[]): WorkflowState {
  return events.reduce(applyEvent, EMPTY_STATE)
}
