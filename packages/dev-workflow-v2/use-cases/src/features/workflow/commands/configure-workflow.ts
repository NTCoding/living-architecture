import type { BaseEvent, WorkflowRegistry } from '@nt-ai-lab/deterministic-agent-workflow-engine'
import { WorkflowStateError } from '@nt-ai-lab/deterministic-agent-workflow-engine'
import type { TransitionContext } from '@nt-ai-lab/deterministic-agent-workflow-dsl'
import {
  getOperationBody,
  getTransitionTitle,
} from '@living-architecture/dev-workflow-v2-domain-model/domain/output-messages'
import { MaintainerWorkflowRegistry } from '@living-architecture/dev-workflow-v2-domain-model/domain/registry'
import { MaintainerWorkflow } from '@living-architecture/dev-workflow-v2-domain-model/domain/workflow'
import { AddressingFeedbackState } from '@living-architecture/dev-workflow-v2-domain-model/domain/states/addressing-feedback'
import { AwaitingCiState } from '@living-architecture/dev-workflow-v2-domain-model/domain/states/awaiting-ci'
import { AwaitingPrFeedbackState } from '@living-architecture/dev-workflow-v2-domain-model/domain/states/awaiting-pr-feedback'
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
import {
  getWorkflowStateNameSchema,
  WorkflowState,
} from '@living-architecture/dev-workflow-v2-domain-model/domain/workflow-types'
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
  getRegistry(): WorkflowRegistry<WorkflowState, StateName, WorkflowOperation>
  buildTransitionContext(
    state: WorkflowState,
    from: StateName,
    to: StateName,
    deps: WorkflowDeps,
  ): TransitionContext<WorkflowState, StateName>
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

/** @riviere-role command-use-case-input */
export type ConfigureWorkflowInput = Readonly<Record<string, never>>

function diffStateOverrides(
  stateBefore: WorkflowState,
  stateAfter: WorkflowState,
): Record<string, unknown> {
  const overrides: Record<string, unknown> = {}
  const beforeEntries = new Map(Object.entries(stateBefore))
  for (const [key, value] of Object.entries(stateAfter)) {
    if (key === 'currentStateMachineState') continue
    if (value !== beforeEntries.get(key)) overrides[key] = value
  }
  return overrides
}

/** @riviere-role command-use-case */
export function configureWorkflow(input: ConfigureWorkflowInput): ConfigureWorkflowResult {
  void input
  const registry = MaintainerWorkflowRegistry.parse({
    IMPLEMENTING: ImplementingState.parse('IMPLEMENTING'),
    REVIEWING: ReviewingState.parse('REVIEWING'),
    SUBMITTING_PR: SubmittingPrState.parse('SUBMITTING_PR'),
    AWAITING_CI: AwaitingCiState.parse('AWAITING_CI'),
    AWAITING_PR_FEEDBACK: AwaitingPrFeedbackState.parse('AWAITING_PR_FEEDBACK'),
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
    stateSchema: getWorkflowStateNameSchema(),
    initialState: WorkflowState.initial,
    getRegistry: () => registry,
    buildTransitionContext(
      state: WorkflowState,
      from: StateName,
      to: StateName,
      deps: WorkflowDeps,
    ): TransitionContext<WorkflowState, StateName> {
      return { state, gitInfo: deps.getGitInfo(), from, to }
    },
    buildTransitionEvent(
      from: StateName,
      to: StateName,
      stateBefore: WorkflowState,
      stateAfter: WorkflowState,
      now: string,
    ): BaseEvent {
      const overrides = diffStateOverrides(stateBefore, stateAfter)
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
