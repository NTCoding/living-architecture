import { parseStateName } from './workflow-types'
import { defineImplementingState } from './states/implementing'
import { defineReviewingState } from './states/reviewing'
import { defineSubmittingPrState } from './states/submitting-pr'
import { defineAwaitingCiState } from './states/awaiting-ci'
import { defineAwaitingPrFeedbackState } from './states/awaiting-pr-feedback'
import { defineAddressingFeedbackState } from './states/addressing-feedback'
import { defineReflectingState } from './states/reflecting'
import { defineCompleteState } from './states/complete'
import { defineBlockedState } from './states/blocked'

const WORKFLOW_REGISTRY = {
  IMPLEMENTING: defineImplementingState(),
  REVIEWING: defineReviewingState(),
  SUBMITTING_PR: defineSubmittingPrState(),
  AWAITING_CI: defineAwaitingCiState(),
  AWAITING_PR_FEEDBACK: defineAwaitingPrFeedbackState(),
  ADDRESSING_FEEDBACK: defineAddressingFeedbackState(),
  REFLECTING: defineReflectingState(),
  COMPLETE: defineCompleteState(),
  BLOCKED: defineBlockedState(),
}

/** @riviere-role domain-service */
export function getStateDefinition(state: string) {
  return WORKFLOW_REGISTRY[parseStateName(state)]
}

/** @riviere-role domain-service */
export function getWorkflowRegistry() {
  return WORKFLOW_REGISTRY
}
