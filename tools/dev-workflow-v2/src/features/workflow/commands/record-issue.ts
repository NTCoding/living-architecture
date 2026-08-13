import type { Workflow } from '../domain/workflow'
import type { WorkflowCommandResult } from './workflow-command-result'

/** @riviere-role command-use-case-input */
export interface RecordIssueInput {
  readonly issueNumber: number
}

/** @riviere-role command-use-case */
export class RecordIssue {
  constructor(private readonly workflow: Workflow) {}

  execute(input: RecordIssueInput): WorkflowCommandResult {
    return this.workflow.executeRecording('record-issue', input.issueNumber)
  }
}
