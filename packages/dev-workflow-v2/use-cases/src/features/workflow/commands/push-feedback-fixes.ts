import type { MaintainerWorkflow as Workflow } from '@living-architecture/dev-workflow-v2-domain-model/domain/workflow'
import type { WorkflowCommandResult } from './workflow-command-result'

/** @riviere-role command-use-case-input */
export type PushFeedbackFixesInput = Record<never, never>

/** @riviere-role command-use-case */
export class PushFeedbackFixes {
  constructor(private readonly workflow: Workflow) {}

  execute(input: PushFeedbackFixesInput): WorkflowCommandResult {
    void input
    return { result: this.workflow.pushFeedbackFixes() }
  }
}
