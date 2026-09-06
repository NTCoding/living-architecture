import type { MaintainerWorkflow } from '@living-architecture/dev-workflow-v2-domain-model/domain/workflow'
import type { WorkflowCommandResult } from './workflow-command-result'

/** @riviere-role command-use-case-input */
export type VerifyLocalInput = Record<never, never>

/** @riviere-role command-use-case */
export class VerifyLocal {
  constructor(private readonly workflow: MaintainerWorkflow) {}

  execute(input: VerifyLocalInput): WorkflowCommandResult {
    void input
    return { result: this.workflow.verifyLocal() }
  }
}
