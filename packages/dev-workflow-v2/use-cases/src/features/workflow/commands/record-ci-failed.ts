import type { Workflow } from '@living-architecture/dev-workflow-v2-domain-model/domain/workflow'
import type { WorkflowCommandResult } from './workflow-command-result'

/** @riviere-role command-use-case-input */
export interface RecordCiFailedInput {
  readonly output: string
}

/** @riviere-role command-use-case */
export class RecordCiFailed {
  constructor(private readonly workflow: Workflow) {}

  execute(input: RecordCiFailedInput): WorkflowCommandResult {
    return { result: this.workflow.executeRecording('record-ci-failed', input.output) }
  }
}
