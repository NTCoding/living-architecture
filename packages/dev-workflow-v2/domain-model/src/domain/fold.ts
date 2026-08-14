import { z } from 'zod'
import type { WorkflowEvent } from './workflow-events'
import { getInitialWorkflowState, WorkflowState } from './workflow-types'

const LIVING_ARCHITECTURE_REVIEW_TYPE_SCHEMA = z.enum([
  'architecture-review',
  'code-review',
  'bug-scanner',
  'task-check',
])

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
      return state.with({ architectureReviewPassed: passed })
    case 'code-review':
      return state.with({ codeReviewPassed: passed })
    case 'bug-scanner':
      return state.with({ bugScannerPassed: passed })
    case 'task-check':
      return state.with({ taskCheckPassed: passed })
  }
}

function applyTransitioned(
  state: WorkflowState,
  event: Extract<WorkflowEvent, { type: 'transitioned' }>,
): WorkflowState {
  const newPreBlockedState = event.to === 'BLOCKED' ? event.from : undefined
  return state.with({
    ...event.stateOverrides,
    currentStateMachineState: event.to,
    preBlockedState: newPreBlockedState,
  })
}

function applyReviewEvent(state: WorkflowState, event: WorkflowEvent): WorkflowState | undefined {
  switch (event.type) {
    case 'architecture-review-completed':
      return state.with({ architectureReviewPassed: event.passed })
    case 'code-review-completed':
      return state.with({ codeReviewPassed: event.passed })
    case 'bug-scanner-completed':
      return state.with({ bugScannerPassed: event.passed })
    case 'ci-completed':
      return state.with({ ciPassed: event.passed })
    case 'feedback-checked':
      return state.with({
        feedbackClean: event.clean,
        feedbackUnresolvedCount: event.unresolvedCount,
      })
    case 'feedback-addressed':
      return state.with({ feedbackAddressed: true })
    case 'pr-feedback-verification-failed':
      return state.with({ prFeedbackVerificationFailedReason: event.reason })
    case 'review-recorded':
      return applyRecordedReviewVerdict(state, event)
  }

  return undefined
}

function applyRecordingEvent(state: WorkflowState, event: WorkflowEvent): WorkflowState {
  const reviewResult = applyReviewEvent(state, event)
  if (reviewResult !== undefined) return reviewResult
  switch (event.type) {
    case 'issue-recorded':
      return state.with({ githubIssue: event.issueNumber })
    case 'branch-recorded':
      return state.with({ featureBranch: event.branch })
    case 'pr-recorded':
      return state.with({
        prNumber: event.prNumber,
        prUrl: event.prUrl,
      })
    case 'task-check-passed':
      return state.with({ taskCheckPassed: true })
    case 'session-started':
      return state.with({
        ...(event.transcriptPath !== undefined && { transcriptPath: event.transcriptPath }),
      })
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
  return events.reduce((state, event) => applyEvent(state, event), getInitialWorkflowState())
}
