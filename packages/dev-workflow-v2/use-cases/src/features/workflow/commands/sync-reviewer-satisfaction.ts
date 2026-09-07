import type { MaintainerWorkflow as Workflow } from '@living-architecture/dev-workflow-v2-domain-model/domain/workflow'
import type { WorkflowCommandResult } from './workflow-command-result'

/** @riviere-role command-use-case-input */
export type SyncReviewerSatisfactionInput = Record<never, never>

/** @riviere-role command-use-case */
export class SyncReviewerSatisfaction {
  constructor(private readonly workflow: Workflow) {}

  execute(input: SyncReviewerSatisfactionInput): WorkflowCommandResult {
    void input
    return { result: this.workflow.syncReviewerSatisfaction() }
  }
}
