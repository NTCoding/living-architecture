import type { WorkflowStateDefinition } from '@nt-ai-lab/deterministic-agent-workflow-dsl'
import type { WorkflowState } from './workflow-types'

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

type ConcreteStateDefinition = WorkflowStateDefinition<
  WorkflowState,
  StateName,
  WorkflowOperation
> & { allowIdle?: boolean }

/** @riviere-role domain-service */
export function defineState(definition: ConcreteStateDefinition): ConcreteStateDefinition {
  return definition
}
