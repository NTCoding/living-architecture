import type { BashForbiddenConfig } from '@ntcoding/agentic-workflow-builder/dsl'
import type {
  ConcreteRegistry, ConcreteStateDefinition 
} from './workflow-types'
import { parseStateName } from './workflow-types'
import { implementingState } from './states/implementing'
import { reviewingState } from './states/reviewing'
import { submittingPrState } from './states/submitting-pr'
import { awaitingCiState } from './states/awaiting-ci'
import { checkingFeedbackState } from './states/checking-feedback'
import { addressingFeedbackState } from './states/addressing-feedback'
import { reflectingState } from './states/reflecting'
import { completeState } from './states/complete'
import { blockedState } from './states/blocked'

export const BASH_FORBIDDEN: BashForbiddenConfig = {
  patterns: [/(?:^|\s|&&|;)git\s+push(?:\s|$|-|;|&)/, /(?:^|\s|&&|;)gh\s+pr(?:\s|$|-|;|&)/],
  flags: ['--no-verify', '--force', '--hard'],
}

export function getStateDefinition(state: string): ConcreteStateDefinition {
  return WORKFLOW_REGISTRY[parseStateName(state)]
}

export const WORKFLOW_REGISTRY: ConcreteRegistry = {
  IMPLEMENTING: implementingState,
  REVIEWING: reviewingState,
  SUBMITTING_PR: submittingPrState,
  AWAITING_CI: awaitingCiState,
  CHECKING_FEEDBACK: checkingFeedbackState,
  ADDRESSING_FEEDBACK: addressingFeedbackState,
  REFLECTING: reflectingState,
  COMPLETE: completeState,
  BLOCKED: blockedState,
}
