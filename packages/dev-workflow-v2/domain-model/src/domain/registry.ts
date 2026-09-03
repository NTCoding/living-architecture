import { z } from 'zod'
import type { WorkflowStateDefinition } from '@nt-ai-lab/deterministic-agent-workflow-dsl'
import { AddressingFeedbackState } from './states/addressing-feedback'
import { AwaitingCiState } from './states/awaiting-ci'
import { AwaitingPrFeedbackState } from './states/awaiting-pr-feedback'
import { BlockedState } from './states/blocked'
import { CompleteState } from './states/complete'
import { ImplementingState } from './states/implementing'
import { ReflectingState } from './states/reflecting'
import { ReviewingState } from './states/reviewing'
import { SubmittingPrState } from './states/submitting-pr'
import type { WorkflowState } from './workflow-types'

const MAINTAINER_WORKFLOW_REGISTRY_SCHEMA = z.object({
  IMPLEMENTING: z.custom<ImplementingState>((value) => value instanceof ImplementingState),
  REVIEWING: z.custom<ReviewingState>((value) => value instanceof ReviewingState),
  SUBMITTING_PR: z.custom<SubmittingPrState>((value) => value instanceof SubmittingPrState),
  AWAITING_CI: z.custom<AwaitingCiState>((value) => value instanceof AwaitingCiState),
  AWAITING_PR_FEEDBACK: z.custom<AwaitingPrFeedbackState>(
    (value) => value instanceof AwaitingPrFeedbackState,
  ),
  ADDRESSING_FEEDBACK: z.custom<AddressingFeedbackState>(
    (value) => value instanceof AddressingFeedbackState,
  ),
  REFLECTING: z.custom<ReflectingState>((value) => value instanceof ReflectingState),
  COMPLETE: z.custom<CompleteState>((value) => value instanceof CompleteState),
  BLOCKED: z.custom<BlockedState>((value) => value instanceof BlockedState),
})

type MaintainerWorkflowRegistryValue = z.infer<typeof MAINTAINER_WORKFLOW_REGISTRY_SCHEMA>
type StateName = WorkflowState['currentStateMachineState']
type WorkflowOperation =
  | 'record-issue'
  | 'record-branch'
  | 'record-review'
  | 'record-pr'
  | 'record-ci-passed'
  | 'record-ci-failed'
  | 'create-pr'
  | 'verify-feedback-addressed'

/** @riviere-role value-object */
export class MaintainerWorkflowRegistry {
  declare private readonly brand: 'MaintainerWorkflowRegistry'

  readonly IMPLEMENTING: ImplementingState
  readonly REVIEWING: ReviewingState
  readonly SUBMITTING_PR: SubmittingPrState
  readonly AWAITING_CI: AwaitingCiState
  readonly AWAITING_PR_FEEDBACK: AwaitingPrFeedbackState
  readonly ADDRESSING_FEEDBACK: AddressingFeedbackState
  readonly REFLECTING: ReflectingState
  readonly COMPLETE: CompleteState
  readonly BLOCKED: BlockedState

  private constructor(value: MaintainerWorkflowRegistryValue) {
    this.IMPLEMENTING = value.IMPLEMENTING
    this.REVIEWING = value.REVIEWING
    this.SUBMITTING_PR = value.SUBMITTING_PR
    this.AWAITING_CI = value.AWAITING_CI
    this.AWAITING_PR_FEEDBACK = value.AWAITING_PR_FEEDBACK
    this.ADDRESSING_FEEDBACK = value.ADDRESSING_FEEDBACK
    this.REFLECTING = value.REFLECTING
    this.COMPLETE = value.COMPLETE
    this.BLOCKED = value.BLOCKED
  }

  static parse(value: unknown): MaintainerWorkflowRegistry {
    return new MaintainerWorkflowRegistry(MAINTAINER_WORKFLOW_REGISTRY_SCHEMA.parse(value))
  }

  state(name: StateName): WorkflowStateDefinition<WorkflowState, StateName, WorkflowOperation> {
    return this[name]
  }
}
