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
  readonly pullRequestUrl: string | null
  readonly stoppedReason: string | null
  readonly failure: string | null
}

/**
 * @riviere-role query-model-use-case
 */
export class ShowRun {
  constructor(private readonly workflowRuns: WorkflowRuns) {}

  async execute(input: ShowRunInput): Promise<RunView> {
    const run = await this.workflowRuns.read(input.runId)
    if (run === undefined) return missing(input.runId)
    return {
      found: true,
      runId: run.runId,
      status: run.status,
      createdAt: run.createdAt,
      waiting: readRunWaiting(run.steps),
      pullRequestUrl: stringFieldOf(run.result, 'pullRequestUrl'),
      stoppedReason: stringFieldOf(run.result, 'stoppedReason'),
      failure: stringFieldOf(run.error, 'message'),
    }
  }
}

function missing(runId: string): RunView {
  return {
    found: false,
    runId,
    status: 'missing',
    createdAt: 0,
    waiting: null,
    pullRequestUrl: null,
    stoppedReason: null,
    failure: null,
  }
}

function stringFieldOf(value: unknown, name: string): string | null {
  if (!isRecord(value)) return null
  const field = value[name]
  return typeof field === 'string' && field !== '' ? field : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
