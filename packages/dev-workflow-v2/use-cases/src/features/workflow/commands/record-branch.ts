import type { Workflow } from '@living-architecture/dev-workflow-v2-domain-model/domain/workflow'
import type { WorkflowCommandResult } from './workflow-command-result'

/** @riviere-role command-use-case-input */
export interface RecordBranchInput {
  readonly branch: string
}

/** @riviere-role command-use-case */
export class RecordBranch {
  constructor(private readonly workflow: Workflow) {}

  execute(input: RecordBranchInput): WorkflowCommandResult {
    return this.workflow.executeRecording('record-branch', input.branch)
  }
}
