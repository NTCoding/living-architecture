import type { Workflow } from '../domain/workflow'
import type { WorkflowCommandResult } from './workflow-command-result'

/** @riviere-role command-use-case-input */
export type RecordCiPassedInput = Record<never, never>

/** @riviere-role command-use-case */
export class RecordCiPassed {
  constructor(private readonly workflow: Workflow) {}

  execute(input: RecordCiPassedInput): WorkflowCommandResult {
    void input
    return this.workflow.executeRecording('record-ci-passed')
  }
}
