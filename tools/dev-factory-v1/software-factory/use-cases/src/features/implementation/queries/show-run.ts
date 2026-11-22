import type { WorkflowRuns } from '@dev-factory-v1/domain-model/domain/ports/workflow-runs'
import { readRunWaiting } from '@dev-factory-v1/domain-model/domain/runs/run-waiting'
import type { RunWaiting } from '@dev-factory-v1/domain-model/domain/runs/run-waiting'

/** @riviere-role query-model-use-case-input */
export interface ShowRunInput {
  readonly runId: string
}

/** @riviere-role query-model */
export interface RunView {
  readonly found: boolean
  readonly runId: string
  readonly status: string
  readonly createdAt: number
  readonly waiting: RunWaiting | null
}

/**
 * @riviere-role query-model-use-case
 */
export class ShowRun {
  constructor(private readonly workflowRuns: WorkflowRuns) {}

  async execute(input: ShowRunInput): Promise<RunView> {
    const run = await this.workflowRuns.read(input.runId)
    if (run === undefined) {
      return {
        found: false,
        runId: input.runId,
        status: 'missing',
        createdAt: 0,
        waiting: null,
      }
    }
    return {
      found: true,
      runId: run.runId,
      status: run.status,
      createdAt: run.createdAt,
      waiting: readRunWaiting(run.steps),
    }
  }
}
