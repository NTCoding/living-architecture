import { describe, expect, it } from 'vitest'
import type { RunStart } from '@dev-factory-v1/domain-model/domain/runs/run-start'
import { StartRun } from './start-run'
import { fakeWorkflowRuns } from '../__fixtures__/workflow-runs-fixtures'

const input = {
  issueNumber: 548,
  model: 'a-model',
  thinking: 'high',
  reviewers: ['code-review'],
  worktreesDirectory: '/repo/.factory/worktrees',
}

describe('StartRun', () => {
  it('starts the first run of an issue', async () => {
    const started: { runId: string; input: RunStart }[] = []
    const command = new StartRun({
      ...fakeWorkflowRuns(),
      start: async (runId, start) => {
        started.push({ runId, input: start })
        return { runId, status: 'running', createdAt: 3000, steps: {} }
      },
    })

    const result = await command.execute({ ...input, issueNumber: 950 })

    expect(result).toStrictEqual({ runId: 'issue-950' })
    expect(started).toStrictEqual([
      {
        runId: 'issue-950',
        input: {
          issueNumber: 950,
          attempt: 1,
          model: 'a-model',
          thinking: 'high',
          reviewers: ['code-review'],
          worktreesDirectory: '/repo/.factory/worktrees',
        },
      },
    ])
  })

  it('starts the next attempt when the issue already has a run', async () => {
    const command = new StartRun(fakeWorkflowRuns())

    const result = await command.execute({ ...input, issueNumber: 548 })

    expect(result).toStrictEqual({ runId: 'issue-548-2' })
  })
})
