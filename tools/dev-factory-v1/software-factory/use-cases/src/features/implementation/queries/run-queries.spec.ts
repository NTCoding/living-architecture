import { describe, expect, it } from 'vitest'
import { ListRuns } from './list-runs'
import { ShowRun } from './show-run'
import { fakeWorkflowRuns } from '../__fixtures__/workflow-runs-fixtures'

describe('ListRuns', () => {
  it('lists every run', async () => {
    const query = new ListRuns(fakeWorkflowRuns())

    const result = await query.execute({})

    expect(result.runs).toStrictEqual([
      { runId: 'issue-548', status: 'suspended', createdAt: 1000 },
      { runId: 'issue-549', status: 'success', createdAt: 2000 },
    ])
  })

  it('passes the status filter to the runs', async () => {
    const asked: (string | undefined)[] = []
    const query = new ListRuns({
      list: async (status) => {
        asked.push(status)
        return []
      },
      read: async () => undefined,
      start: async (runId) => ({
        runId,
        status: 'running',
        createdAt: 0,
        steps: {},
        result: undefined,
        error: undefined,
      }),
      resume: async (runId) => ({
        runId,
        status: 'running',
        createdAt: 0,
        steps: {},
        result: undefined,
        error: undefined,
      }),
    })

    const result = await query.execute({ status: 'suspended' })

    expect(asked).toStrictEqual(['suspended'])
    expect(result.runs).toStrictEqual([])
  })
})

describe('ShowRun', () => {
  it('shows the question a suspended run waits on', async () => {
    const query = new ShowRun(fakeWorkflowRuns())

    const result = await query.execute({ runId: 'issue-548' })

    expect(result).toStrictEqual({
      found: true,
      runId: 'issue-548',
      status: 'suspended',
      createdAt: 1000,
      waiting: { kind: 'implementer-question', question: 'Which database?' },
      pullRequestUrl: null,
      stoppedReason: null,
      failure: null,
    })
  })

  it('shows a run that is not waiting for anybody', async () => {
    const query = new ShowRun(fakeWorkflowRuns())

    const result = await query.execute({ runId: 'issue-549' })

    expect(result).toStrictEqual({
      found: true,
      runId: 'issue-549',
      status: 'success',
      createdAt: 2000,
      waiting: null,
      pullRequestUrl: 'https://github.com/acme/repo/pull/1',
      stoppedReason: null,
      failure: null,
    })
  })

  it('reports a run that does not exist', async () => {
    const query = new ShowRun(fakeWorkflowRuns())

    const result = await query.execute({ runId: 'issue-950' })

    expect(result).toStrictEqual({
      found: false,
      runId: 'issue-950',
      status: 'missing',
      createdAt: 0,
      waiting: null,
      pullRequestUrl: null,
      stoppedReason: null,
      failure: null,
    })
  })
})
