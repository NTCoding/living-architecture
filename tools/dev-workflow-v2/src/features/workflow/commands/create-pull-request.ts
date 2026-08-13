import type { Workflow } from '../domain/workflow'
import type { WorkflowCommandResult } from './workflow-command-result'

/** @riviere-role command-use-case-input */
export interface CreatePullRequestInput {
  readonly arguments: readonly string[]
}

/** @riviere-role command-use-case */
export class CreatePullRequest {
  constructor(private readonly workflow: Workflow) {}

  execute(input: CreatePullRequestInput): WorkflowCommandResult {
    return this.workflow.createPr(input.arguments)
  }
}
