import type { Workflow } from '@living-architecture/dev-workflow-v2-domain-model/domain/workflow'
import type { WorkflowCommandResult } from './workflow-command-result'

/** @riviere-role command-use-case-input */
export type VerifyFeedbackAddressedInput = Record<never, never>

/** @riviere-role command-use-case */
export class VerifyFeedbackAddressed {
  constructor(private readonly workflow: Workflow) {}

  execute(input: VerifyFeedbackAddressedInput): WorkflowCommandResult {
    void input
    return { result: this.workflow.verifyFeedbackAddressed() }
  }
}
