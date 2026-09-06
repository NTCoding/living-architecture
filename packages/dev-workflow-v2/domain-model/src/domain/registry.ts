import { z } from 'zod'
import type {
  WorkflowStateDefinition,
  RecordingOpDefinition,
} from '@nt-ai-lab/deterministic-agent-workflow-dsl'
import { AddressingFeedbackState } from './states/addressing-feedback'
import { AwaitingCiState } from './states/awaiting-ci'
import { AwaitingPrFeedbackState } from './states/awaiting-pr-feedback'
import { BlockedState } from './states/blocked'
import { CompleteState } from './states/complete'
import { VerifyingState } from './states/verifying'
import { ImplementingState } from './states/implementing'
import { ReflectingState } from './states/reflecting'
import { ReviewingState } from './states/reviewing'
import { SubmittingPrState } from './states/submitting-pr'
import type { WorkflowState } from './workflow-types'
import type { WorkflowTransitionContext } from './workflow-transition-context'

const RECORDING_OPS_MAP: Record<string, RecordingOpDefinition<readonly never[]>> = {
  'record-issue': {
    event: 'issue-recorded',
    payload: (n: number) => ({ issueNumber: n }),
  },
  'record-branch': {
    event: 'branch-recorded',
    payload: (b: string) => ({ branch: b }),
  },
  'record-pr': {
    event: 'pr-recorded',
    payload: (n: number, url?: string) => ({
      prNumber: n,
      ...(url ? { prUrl: url } : {}),
    }),
  },
  'record-ci-passed': {
    event: 'ci-completed',
    payload: () => ({ passed: true }),
  },
  'record-ci-failed': {
    event: 'ci-completed',
    payload: (output: string) => ({
      passed: false,
      output,
    }),
  },
}

const MAINTAINER_WORKFLOW_REGISTRY_SCHEMA = z.object({
  VERIFYING: z.custom<VerifyingState>((value) => value instanceof VerifyingState),
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
  | 'verify-local'
  | 'record-issue'
  | 'record-branch'
  | 'record-review'
  | 'record-pr'
  | 'record-ci-passed'
  | 'record-ci-failed'
  | 'create-pr'
  | 'verify-feedback-addressed'
  | 'verify-pr-review-gate'

/** @riviere-role value-object */
export class MaintainerWorkflowRegistry {
  declare private readonly brand: 'MaintainerWorkflowRegistry'

  readonly VERIFYING: VerifyingState
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
    this.VERIFYING = value.VERIFYING
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

  recordingOperations(): typeof RECORDING_OPS_MAP {
    return RECORDING_OPS_MAP
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
