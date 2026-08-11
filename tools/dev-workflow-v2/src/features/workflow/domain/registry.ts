import type { BashForbiddenConfig } from '@nt-ai-lab/deterministic-agent-workflow-dsl'
import type {
  ConcreteRegistry, ConcreteStateDefinition 
} from './workflow-types'
import { parseStateName } from './workflow-types'
import { implementingState } from './states/implementing'
import { reviewingState } from './states/reviewing'
import { submittingPrState } from './states/submitting-pr'
import { awaitingCiState } from './states/awaiting-ci'
import { awaitingPrFeedbackState } from './states/awaiting-pr-feedback'
import { addressingFeedbackState } from './states/addressing-feedback'
import { reflectingState } from './states/reflecting'
import { completeState } from './states/complete'
import { blockedState } from './states/blocked'

export const BASH_FORBIDDEN: BashForbiddenConfig = {
  commands: ['git push', 'gh pr'],
  flags: ['--no-verify', '--force', '--hard'],
}

/** @riviere-role domain-service */
export function getStateDefinition(state: string): ConcreteStateDefinition {
  return WORKFLOW_REGISTRY[parseStateName(state)]
}

export const WORKFLOW_REGISTRY: ConcreteRegistry = {
  IMPLEMENTING: implementingState,
  REVIEWING: reviewingState,
  SUBMITTING_PR: submittingPrState,
  AWAITING_CI: awaitingCiState,
  AWAITING_PR_FEEDBACK: awaitingPrFeedbackState,
  ADDRESSING_FEEDBACK: addressingFeedbackState,
  REFLECTING: reflectingState,
  COMPLETE: completeState,
  BLOCKED: blockedState,
}
