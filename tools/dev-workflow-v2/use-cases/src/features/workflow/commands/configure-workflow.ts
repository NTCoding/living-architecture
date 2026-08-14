import type { BaseEvent, WorkflowDefinition } from '@nt-ai-lab/deterministic-agent-workflow-engine'
import { WorkflowStateError } from '@nt-ai-lab/deterministic-agent-workflow-engine'
import type { TransitionContext } from '@nt-ai-lab/deterministic-agent-workflow-dsl'
import { applyEvent } from '@living-architecture/dev-workflow-v2-domain-model/domain/fold'
import {
  getOperationBody,
  getTransitionTitle,
} from '@living-architecture/dev-workflow-v2-domain-model/domain/output-messages'
import { getWorkflowRegistry } from '@living-architecture/dev-workflow-v2-domain-model/domain/registry'
import { Workflow } from '@living-architecture/dev-workflow-v2-domain-model/domain/workflow'
import {
  getKnownWorkflowEventTypes,
  parseWorkflowEvent,
} from '@living-architecture/dev-workflow-v2-domain-model/domain/workflow-events'
import type { WorkflowState } from '@living-architecture/dev-workflow-v2-domain-model/domain/workflow-types'
import {
  getInitialWorkflowState,
  getWorkflowStateNameSchema,
} from '@living-architecture/dev-workflow-v2-domain-model/domain/workflow-types'
import { isWriteAllowed } from '@living-architecture/dev-workflow-v2-domain-model/domain/workflow-predicates'

type WorkflowDeps = Parameters<typeof Workflow.rehydrate>[1]
type StateName = WorkflowState['currentStateMachineState']
type WorkflowOperation = Parameters<Workflow['executeRecording']>[0]
/** @riviere-role command-use-case-result */
export type ConfigureWorkflowResult = WorkflowDefinition<
  Workflow,
  WorkflowState,
  WorkflowDeps,
  StateName,
  WorkflowOperation
> & {
  readonly isWriteAllowed: typeof isWriteAllowed
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
  return {
    fold(state: WorkflowState, event: BaseEvent): WorkflowState {
      try {
        return applyEvent(state, parseWorkflowEvent(event))
      } catch (error) {
        if (KNOWN_EVENT_TYPES.has(event.type)) {
          throw new WorkflowStateError(`Malformed workflow event "${event.type}": ${String(error)}`)
        }
        return state
      }
    },
    buildWorkflow(state: WorkflowState, deps: WorkflowDeps): Workflow {
      return Workflow.rehydrate(state, deps)
    },
    stateSchema: getWorkflowStateNameSchema(),
    initialState: getInitialWorkflowState,
    getRegistry: getWorkflowRegistry,
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
