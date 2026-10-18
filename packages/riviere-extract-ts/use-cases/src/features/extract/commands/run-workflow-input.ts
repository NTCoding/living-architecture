import type { WorkflowRunMode } from '@living-architecture/riviere-extract-ts-domain-model/domain/workflow'

/** @riviere-role command-use-case-input */
export interface RunWorkflowInput {
  readonly workflowPath: string
  readonly mode?: WorkflowRunMode
}
