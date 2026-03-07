import type {
  WorkflowDefinition, BaseEvent 
} from '@ntcoding/agentic-workflow-builder/engine'
import { WorkflowStateError } from '@ntcoding/agentic-workflow-builder/engine'
import type { TransitionContext } from '@ntcoding/agentic-workflow-builder/dsl'
import type {
  WorkflowState, StateName, WorkflowOperation 
} from '../domain/workflow-types'
import {
  Workflow, type WorkflowDeps 
} from '../domain/workflow'
import {
  INITIAL_STATE, parseStateName 
} from '../domain/workflow-types'
import {
  getOperationBody, getTransitionTitle 
} from '../domain/output-messages'
import { applyEvents } from '../domain/fold'
import { WORKFLOW_EVENT_SCHEMA } from '../domain/workflow-events'
import { WORKFLOW_REGISTRY } from '../domain/registry'

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
  createFresh(deps: WorkflowDeps): Workflow {
    return Workflow.createFresh(deps)
  },
  rehydrate(events: readonly BaseEvent[], deps: WorkflowDeps): Workflow {
    const workflowEvents = events.map((e) => {
      const result = WORKFLOW_EVENT_SCHEMA.safeParse(e)
      if (!result.success) {
        throw new WorkflowStateError(
          `Unknown event type in store: "${e.type}". Event store may be corrupted or from a newer version.`,
        )
      }
      return result.data
    })
    const state = applyEvents(workflowEvents)
    return Workflow.rehydrate(state, deps)
  },
  procedurePath(state: StateName, pluginRoot: string): string {
    return Workflow.procedurePath(state, pluginRoot)
  },
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
    const prChecksPass = state.prNumber === undefined ? false : deps.checkPrChecks(state.prNumber)
    return {
      state,
      gitInfo: deps.getGitInfo(),
      prChecksPass,
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
  parseStateName,
  getOperationBody(op) {
    return getOperationBody(op)
  },
  getTransitionTitle(to) {
    return getTransitionTitle(to)
  },
}
