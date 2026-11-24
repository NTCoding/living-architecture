import { nextRun } from '@dev-factory-v1/domain-model/domain/runs/next-run'
import type { WorkflowRuns } from '@dev-factory-v1/domain-model/domain/ports/workflow-runs'

/** @riviere-role command-use-case-input */
export interface StartRunInput {
  readonly issueNumber: number
  readonly model: string
  readonly observerModel: string
  readonly thinking: string
  readonly reviewers: readonly string[]
  readonly worktreesDirectory: string
}

/** @riviere-role command-use-case-result */
export interface StartRunResult {
  readonly runId: string
}

/**
 * @riviere-role command-use-case
 */
export class StartRun {
  constructor(private readonly workflowRuns: WorkflowRuns) {}

  async execute(input: StartRunInput): Promise<StartRunResult> {
    const { runId, attempt } = nextRun(
      (await this.workflowRuns.list(undefined)).map((run) => run.runId),
      input.issueNumber,
    )
    const snapshot = await this.workflowRuns.start(runId, {
      issueNumber: input.issueNumber,
      attempt,
      model: input.model,
      observerModel: input.observerModel,
      thinking: input.thinking,
      reviewers: input.reviewers,
      worktreesDirectory: input.worktreesDirectory,
    })
    return { runId: snapshot.runId }
  }
}
