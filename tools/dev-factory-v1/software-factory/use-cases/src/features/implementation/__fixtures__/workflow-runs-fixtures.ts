import type { WorkflowRuns } from '@dev-factory-v1/domain-model/domain/ports/workflow-runs'

const RUNS = [
  {
    runId: 'issue-548',
    status: 'suspended',
    createdAt: 1000,
    steps: {
      implement: [{ status: 'suspended', suspendPayload: { question: 'Which database?' } }],
    },
  },
  {
    runId: 'issue-549',
    status: 'success',
    createdAt: 2000,
    steps: { implement: [{ status: 'success' }] },
  },
]

export function fakeWorkflowRuns(): WorkflowRuns {
  return {
    list: async () => RUNS,
    read: async (runId) => RUNS.find((run) => run.runId === runId),
    start: async (runId) => ({
      runId,
      status: 'running',
      createdAt: 3000,
      steps: {},
    }),
    resume: async (runId) => ({
      runId,
      status: 'success',
      createdAt: 4000,
      steps: {},
    }),
  }
}
