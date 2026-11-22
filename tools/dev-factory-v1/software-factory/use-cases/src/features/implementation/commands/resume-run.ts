import type { WorkflowRuns } from '@dev-factory-v1/domain-model/domain/ports/workflow-runs'
import { readRunWaiting } from '@dev-factory-v1/domain-model/domain/runs/run-waiting'

/** @riviere-role command-use-case-input */
export interface ResumeRunInput {
  readonly runId: string
  readonly answer: string | boolean
}

/** @riviere-role command-use-case-result */
export interface ResumeRunResult {
  readonly runId: string
  readonly status: string
}

/**
 * @riviere-role command-use-case
 */
export class ResumeRun {
  constructor(private readonly workflowRuns: WorkflowRuns) {}

  async execute(input: ResumeRunInput): Promise<ResumeRunResult> {
    const run = await this.workflowRuns.read(input.runId)
    if (run === undefined) return { runId: input.runId, status: 'missing' }
    const waiting = readRunWaiting(run.steps)
    if (waiting === null) return { runId: input.runId, status: run.status }
    const resumed = await this.workflowRuns.resume(input.runId, waiting, input.answer)
    return { runId: resumed.runId, status: resumed.status }
  }
}
