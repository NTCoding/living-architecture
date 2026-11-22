import type { RunSnapshot } from '../runs/run-snapshot'
import type { RunStart } from '../runs/run-start'
import type { RunWaiting } from '../runs/run-waiting'

/**
 * @riviere-role domain-port
 *
 * @riviere-role-justification The runs live in Mastra's workflow store, which the factory only
 * reads back after a process restart. These are current external facts about a run, not restored
 * aggregate state that a repository should load.
 */
export interface WorkflowRuns {
  list(status: string | undefined): Promise<readonly RunSnapshot[]>
  read(runId: string): Promise<RunSnapshot | undefined>
  start(runId: string, input: RunStart): Promise<RunSnapshot>
  resume(runId: string, waiting: RunWaiting, answer: string | boolean): Promise<RunSnapshot>
}
