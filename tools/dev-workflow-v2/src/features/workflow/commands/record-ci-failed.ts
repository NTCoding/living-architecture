import type { Workflow } from '../domain/workflow'
import type { WorkflowCommandResult } from './workflow-command-result'

/** @riviere-role command-use-case-input */
export interface RecordCiFailedInput {
  readonly output: string
}

/** @riviere-role command-use-case */
export class RecordCiFailed {
  constructor(private readonly workflow: Workflow) {}

  execute(input: RecordCiFailedInput): WorkflowCommandResult {
    return this.workflow.executeRecording('record-ci-failed', input.output)
  }
}
