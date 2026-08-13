import type { Workflow } from '../domain/workflow'
import type { WorkflowCommandResult } from './workflow-command-result'

/** @riviere-role command-use-case-input */
export type VerifyFeedbackAddressedInput = Record<never, never>

/** @riviere-role command-use-case */
export class VerifyFeedbackAddressed {
  constructor(private readonly workflow: Workflow) {}

  execute(input: VerifyFeedbackAddressedInput): WorkflowCommandResult {
    void input
    return this.workflow.verifyFeedbackAddressed()
  }
}
