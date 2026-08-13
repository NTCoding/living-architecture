import type { Workflow } from '../domain/workflow'
import type { WorkflowCommandResult } from './workflow-command-result'

/** @riviere-role command-use-case-input */
export interface RecordPullRequestInput {
  readonly number: number
  readonly url: string | undefined
}

/** @riviere-role command-use-case */
export class RecordPullRequest {
  constructor(private readonly workflow: Workflow) {}

  execute(input: RecordPullRequestInput): WorkflowCommandResult {
    return this.workflow.executeRecording('record-pr', input.number, input.url)
  }
}
