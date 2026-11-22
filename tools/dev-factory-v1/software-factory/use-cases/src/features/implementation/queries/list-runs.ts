import type { WorkflowRuns } from '@dev-factory-v1/domain-model/domain/ports/workflow-runs'

/** @riviere-role query-model-use-case-input */
export interface ListRunsInput {
  readonly status?: string
}

/** @riviere-role query-model-value */
export interface RunSummary {
  readonly runId: string
  readonly status: string
  readonly createdAt: number
}

/** @riviere-role query-model */
export interface RunList {
  readonly runs: readonly RunSummary[]
}

/**
 * @riviere-role query-model-use-case
 */
export class ListRuns {
  constructor(private readonly workflowRuns: WorkflowRuns) {}

  async execute(input: ListRunsInput): Promise<RunList> {
    const runs = await this.workflowRuns.list(input.status)
    return {
      runs: runs.map((run) => ({
        runId: run.runId,
        status: run.status,
        createdAt: run.createdAt,
      })),
    }
  }
}
