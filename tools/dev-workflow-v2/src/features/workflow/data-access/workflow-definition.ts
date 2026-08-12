import type { WorkflowDefinition, BaseEvent } from '@nt-ai-lab/deterministic-agent-workflow-engine'
import { WorkflowStateError } from '@nt-ai-lab/deterministic-agent-workflow-engine'
import type { TransitionContext } from '@nt-ai-lab/deterministic-agent-workflow-dsl'
import type { WorkflowState } from '../domain/workflow-types'
import { Workflow } from '../domain/workflow'
import { INITIAL_STATE, STATE_NAME_SCHEMA } from '../domain/workflow-types'
import { getOperationBody, getTransitionTitle } from '../domain/output-messages'
import { applyEvent } from '../domain/fold'
import { getKnownWorkflowEventTypes, parseWorkflowEvent } from '../domain/workflow-events'
import { WORKFLOW_REGISTRY } from '../domain/registry'

type WorkflowDeps = Parameters<typeof Workflow.rehydrate>[1]
type StateName = WorkflowState['currentStateMachineState']
type WorkflowOperation = Parameters<Workflow['executeRecording']>[0]
const KNOWN_EVENT_TYPES: ReadonlySet<string> = new Set(getKnownWorkflowEventTypes())

function diffStateOverrides(
  stateBefore: WorkflowState,
  stateAfter: WorkflowState,
): Record<string, unknown> {
  const overrides: Record<string, unknown> = {}
  const beforeEntries = new Map(Object.entries(stateBefore))
  for (const [key, value] of Object.entries(stateAfter)) {
    if (key === 'currentStateMachineState') continue
    if (value !== beforeEntries.get(key)) {
      overrides[key] = value
    }
  }
  return overrides
}

export const WORKFLOW_DEFINITION: WorkflowDefinition<
  Workflow,
  WorkflowState,
  WorkflowDeps,
  StateName,
  WorkflowOperation
> = {
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
  stateSchema: STATE_NAME_SCHEMA,
  initialState(): typeof INITIAL_STATE {
    return INITIAL_STATE
  },
  getRegistry: () => WORKFLOW_REGISTRY,
  buildTransitionContext(
    state: WorkflowState,
    from: StateName,
    to: StateName,
    deps: WorkflowDeps,
  ): TransitionContext<WorkflowState, StateName> {
    return {
      state,
      gitInfo: deps.getGitInfo(),
      from,
      to,
    }
  },
  buildTransitionEvent(
    from: StateName,
    to: StateName,
    stateBefore: WorkflowState,
    stateAfter: WorkflowState,
    now: string,
  ): BaseEvent {
    const overrides = diffStateOverrides(stateBefore, stateAfter)
    const event = {
      type: 'transitioned',
      at: now,
      from,
      to,
      ...(Object.keys(overrides).length > 0 ? { stateOverrides: overrides } : {}),
    }
    return event
  },
  getOperationBody(op) {
    return getOperationBody(op)
  },
  getTransitionTitle(to) {
    return getTransitionTitle(to)
  },
}
