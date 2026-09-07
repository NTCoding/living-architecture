import { VerifyingState } from '@living-architecture/dev-workflow-v2-domain-model/domain/states/verifying'
import type { BaseEvent, WorkflowRegistry } from '@nt-ai-lab/deterministic-agent-workflow-engine'
import { WorkflowStateError } from '@nt-ai-lab/deterministic-agent-workflow-engine'
import {
  getOperationBody,
  getTransitionTitle,
} from '@living-architecture/dev-workflow-v2-domain-model/domain/output-messages'
import { MaintainerWorkflowRegistry } from '@living-architecture/dev-workflow-v2-domain-model/domain/registry'
import { MaintainerWorkflow } from '@living-architecture/dev-workflow-v2-domain-model/domain/workflow'
import { ReviewerDefinition } from '@living-architecture/dev-workflow-v2-domain-model/domain/reviewer-definitions'
import { AddressingFeedbackState } from '@living-architecture/dev-workflow-v2-domain-model/domain/states/addressing-feedback'
import { BlockedState } from '@living-architecture/dev-workflow-v2-domain-model/domain/states/blocked'
import { CompleteState } from '@living-architecture/dev-workflow-v2-domain-model/domain/states/complete'
import { ImplementingState } from '@living-architecture/dev-workflow-v2-domain-model/domain/states/implementing'
import { ReflectingState } from '@living-architecture/dev-workflow-v2-domain-model/domain/states/reflecting'
import { ReviewingState } from '@living-architecture/dev-workflow-v2-domain-model/domain/states/reviewing'
import { SubmittingPrState } from '@living-architecture/dev-workflow-v2-domain-model/domain/states/submitting-pr'
import {
  getKnownWorkflowEventTypes,
  parseWorkflowEvent,
} from '@living-architecture/dev-workflow-v2-domain-model/domain/workflow-events'
import { WorkflowState } from '@living-architecture/dev-workflow-v2-domain-model/domain/workflow-types'
import { WorkflowTransitionContext } from '@living-architecture/dev-workflow-v2-domain-model/domain/workflow-transition-context'
import { isWriteAllowed } from '@living-architecture/dev-workflow-v2-domain-model/domain/workflow-predicates'
import type { ZodType } from 'zod'

type WorkflowDeps = Parameters<typeof MaintainerWorkflow.build>[1]
type StateName = WorkflowState['currentStateMachineState']
type WorkflowOperation = Parameters<MaintainerWorkflow['executeRecording']>[0]
/** @riviere-role command-use-case-result */
export interface ConfigureWorkflowResult {
  fold(state: WorkflowState, event: BaseEvent): WorkflowState
  buildWorkflow(state: WorkflowState, deps: WorkflowDeps): MaintainerWorkflow
  stateSchema: ZodType<StateName>
  initialState(): WorkflowState
  getRegistry(): WorkflowRegistry<
    WorkflowState,
    StateName,
    WorkflowOperation,
    WorkflowTransitionContext
  >
  buildTransitionContext(
    state: WorkflowState,
    from: StateName,
    to: StateName,
    deps: WorkflowDeps,
  ): WorkflowTransitionContext
  buildTransitionEvent(
    from: StateName,
    to: StateName,
    stateBefore: WorkflowState,
    stateAfter: WorkflowState,
    now: string,
  ): BaseEvent
  getOperationBody(op: string, state: WorkflowState): string
  getTransitionTitle(to: StateName, state: WorkflowState): string
  isWriteAllowed: typeof isWriteAllowed
}
const KNOWN_EVENT_TYPES: ReadonlySet<string> = new Set(getKnownWorkflowEventTypes())

const REVIEWER_DEFINITIONS: readonly ReviewerDefinition[] = ReviewerDefinition.parseAll([
  {
    reviewType: 'architecture-review',
    agentInstructions: 'agents/architecture-review.md',
    version: '1',
  },
  { reviewType: 'code-review', agentInstructions: 'agents/code-review.md', version: '1' },
  { reviewType: 'bug-scanner', agentInstructions: 'agents/bug-scanner.md', version: '1' },
  { reviewType: 'task-check', agentInstructions: 'agents/task-check.md', version: '1' },
])

/** @riviere-role command-use-case-input */
export type ConfigureWorkflowInput = Readonly<{
  runCodeReview: (reviewers: readonly ReviewerDefinition[]) => void
}>

/** @riviere-role command-use-case */
export function configureWorkflow(input: ConfigureWorkflowInput): ConfigureWorkflowResult {
  const registry = MaintainerWorkflowRegistry.parse({
    IMPLEMENTING: ImplementingState.parse('IMPLEMENTING'),
    VERIFYING: VerifyingState.parse('VERIFYING'),
    REVIEWING: ReviewingState.parse('REVIEWING', {
      reviewers: REVIEWER_DEFINITIONS,
      runCodeReview: input.runCodeReview,
    }),
    SUBMITTING_PR: SubmittingPrState.parse('SUBMITTING_PR'),
    ADDRESSING_FEEDBACK: AddressingFeedbackState.parse('ADDRESSING_FEEDBACK'),
    REFLECTING: ReflectingState.parse('REFLECTING'),
    COMPLETE: CompleteState.parse('COMPLETE'),
    BLOCKED: BlockedState.parse('BLOCKED'),
  })
  return {
    fold(state: WorkflowState, event: BaseEvent): WorkflowState {
      try {
        return state.apply(parseWorkflowEvent(event))
      } catch (error) {
        if (KNOWN_EVENT_TYPES.has(event.type)) {
          throw new WorkflowStateError(`Malformed workflow event "${event.type}": ${String(error)}`)
        }
        return state
      }
    },
    buildWorkflow(state: WorkflowState, deps: WorkflowDeps): MaintainerWorkflow {
      return MaintainerWorkflow.build(registry, deps, state)
    },
    stateSchema: WorkflowState.stateNameSchema(),
    initialState: WorkflowState.initial,
    getRegistry: () => registry,
    buildTransitionContext(
      state: WorkflowState,
      from: StateName,
      to: StateName,
      deps: WorkflowDeps,
    ): WorkflowTransitionContext {
      return WorkflowTransitionContext.from({
        state,
        gitInfo: deps.getGitInfo(),
        from,
        to,
      })
    },
    buildTransitionEvent(
      from: StateName,
      to: StateName,
      stateBefore: WorkflowState,
      stateAfter: WorkflowState,
      now: string,
    ): BaseEvent {
      const overrides = stateAfter.transitionOverridesFrom(stateBefore)
      return {
        type: 'transitioned',
        at: now,
        from,
        to,
        ...(Object.keys(overrides).length > 0 ? { stateOverrides: overrides } : {}),
      }
    },
    getOperationBody,
    getTransitionTitle,
    isWriteAllowed,
  }
}
