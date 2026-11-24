import type { WorkflowRuns } from '@dev-factory-v1/domain-model/domain/ports/workflow-runs'

type RunWaiting = Parameters<WorkflowRuns['resume']>[1]

const RUN_STATUSES = [
  'running',
  'success',
  'failed',
  'tripwire',
  'suspended',
  'waiting',
  'pending',
  'canceled',
  'bailed',
  'paused',
  'skipped',
] as const

type RunStatus = (typeof RUN_STATUSES)[number]

/**
 * @riviere-role domain-port-adapter
 */
export function workflowRunsWithMastra(source: {
  readonly listRuns: (
    status: string | undefined,
  ) => Promise<
    readonly { readonly runId: string; readonly snapshot: unknown; readonly createdAt: Date }[]
  >
  readonly readState: (runId: string) => Promise<unknown>
  readonly startRun: (runId: string, input: Record<string, unknown>) => Promise<unknown>
  readonly resumeRun: (runId: string, options: Record<string, unknown>) => Promise<unknown>
}): WorkflowRuns {
  return {
    list: async (status) =>
      (await source.listRuns(runStatusOf(status))).map((run) => ({
        runId: run.runId,
        status: statusOf(run.snapshot),
        createdAt: run.createdAt.getTime(),
        steps: stepsOf(run.snapshot),
        result: fieldOf(run.snapshot, 'result'),
        error: fieldOf(run.snapshot, 'error'),
      })),
    read: async (runId) => snapshotOf(runId, await source.readState(runId)),
    start: async (runId, input) => {
      await source.startRun(runId, {
        issueNumber: input.issueNumber,
        attempt: input.attempt,
        model: input.model,
        observerModel: input.observerModel,
        thinking: input.thinking,
        reviewers: input.reviewers,
        worktreesDirectory: input.worktreesDirectory,
      })
      return snapshotOf(runId, await source.readState(runId))
    },
    resume: async (runId, waiting, answer) => {
      await source.resumeRun(runId, resumeOf(waiting, answer))
      return snapshotOf(runId, await source.readState(runId))
    },
  }
}

function snapshotOf(runId: string, state: unknown) {
  return {
    runId,
    status: statusOf(state),
    createdAt: Date.now(),
    steps: stepsOf(state),
    result: fieldOf(state, 'result'),
    error: fieldOf(state, 'error'),
  }
}

function resumeOf(waiting: RunWaiting, answer: string | boolean): Record<string, unknown> {
  switch (waiting.kind) {
    case 'implementer-question':
      return {
        step: 'implement',
        resumeData: {
          answer: typeof answer === 'string' ? answer : '',
          question: waiting.question,
        },
      }
    case 'plan-question':
      return { step: 'wait-for-plan-clarification', resumeData: { answer: String(answer) } }
    case 'feedback-question':
      if (typeof answer === 'boolean') {
        return { step: 'address-feedback', resumeData: { approved: answer } }
      }
      return { step: 'address-feedback', resumeData: { answer } }
  }
}

function runStatusOf(status: string | undefined): RunStatus | undefined {
  const filter = RUN_STATUSES.find((known) => known === status)
  return filter
}

function statusOf(state: unknown): string {
  const parsed = parseState(state)
  return parsed !== null && typeof parsed['status'] === 'string' ? parsed['status'] : 'unknown'
}

function fieldOf(state: unknown, name: string): unknown {
  const parsed = parseState(state)
  return parsed === null ? undefined : parsed[name]
}

function stepsOf(state: unknown): unknown {
  const parsed = parseState(state)
  return parsed === null ? {} : parsed['steps']
}

function parseState(state: unknown): Record<string, unknown> | null {
  if (typeof state === 'string') return parseJsonRecord(state)
  return isRecord(state) ? state : null
}

function parseJsonRecord(value: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(value)
    return isRecord(parsed) ? parsed : null
  } catch {
    return null
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
