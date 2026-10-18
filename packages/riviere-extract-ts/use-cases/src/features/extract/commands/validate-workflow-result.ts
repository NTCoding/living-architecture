import type { WorkflowRunResult } from '@living-architecture/riviere-extract-ts-domain-model/domain/workflow'

/** @riviere-role command-use-case-result */
export interface ValidateWorkflowResult {
  readonly result: WorkflowRunResult
}
