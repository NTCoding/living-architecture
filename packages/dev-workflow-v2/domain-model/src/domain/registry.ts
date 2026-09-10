import { z } from 'zod'
import type { WorkflowStateDefinition } from '@nt-ai-lab/deterministic-agent-workflow-dsl'
import { AddressingFeedbackState } from './states/addressing-feedback'
import { BlockedState } from './states/blocked'
import { ImplementingState } from './states/implementing'
import { HumanReviewingState } from './states/human-reviewing'
import { ReviewingState } from './states/reviewing'
import { SubmittingPrState } from './states/submitting-pr'
import type { WorkflowState } from './workflow-types'
import type { WorkflowTransitionContext } from './workflow-transition-context'

const MAINTAINER_WORKFLOW_REGISTRY_SCHEMA = z.object({
  IMPLEMENTING: z.custom<ImplementingState>((value) => value instanceof ImplementingState),
  REVIEWING: z.custom<ReviewingState>((value) => value instanceof ReviewingState),
  SUBMITTING_PR: z.custom<SubmittingPrState>((value) => value instanceof SubmittingPrState),
  ADDRESSING_FEEDBACK: z.custom<AddressingFeedbackState>(
    (value) => value instanceof AddressingFeedbackState,
  ),
  HUMAN_REVIEWING: z.custom<HumanReviewingState>((value) => value instanceof HumanReviewingState),
  BLOCKED: z.custom<BlockedState>((value) => value instanceof BlockedState),
})

type MaintainerWorkflowRegistryValue = z.infer<typeof MAINTAINER_WORKFLOW_REGISTRY_SCHEMA>
type StateName = WorkflowState['currentStateMachineState']
type WorkflowOperation = 'record-issue' | 'record-branch' | 'record-reviewer-status' | 'create-pr'

/** @riviere-role value-object */
export class MaintainerWorkflowRegistry {
  declare private readonly brand: 'MaintainerWorkflowRegistry'

  readonly IMPLEMENTING: ImplementingState
  readonly REVIEWING: ReviewingState
  readonly SUBMITTING_PR: SubmittingPrState
  readonly ADDRESSING_FEEDBACK: AddressingFeedbackState
  readonly HUMAN_REVIEWING: HumanReviewingState
  readonly BLOCKED: BlockedState

  private constructor(value: MaintainerWorkflowRegistryValue) {
    this.IMPLEMENTING = value.IMPLEMENTING
    this.REVIEWING = value.REVIEWING
    this.SUBMITTING_PR = value.SUBMITTING_PR
    this.ADDRESSING_FEEDBACK = value.ADDRESSING_FEEDBACK
    this.HUMAN_REVIEWING = value.HUMAN_REVIEWING
    this.BLOCKED = value.BLOCKED
  }

  static parse(value: unknown): MaintainerWorkflowRegistry {
    return new MaintainerWorkflowRegistry(MAINTAINER_WORKFLOW_REGISTRY_SCHEMA.parse(value))
  }

  state(
    name: StateName,
  ): WorkflowStateDefinition<
    WorkflowState,
    StateName,
    WorkflowOperation,
    WorkflowTransitionContext
  > {
    return this[name]
  }
}
