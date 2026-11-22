import { describe, expect, it } from 'vitest'
import { ResumeRun } from './resume-run'
import { fakeWorkflowRuns } from '../__fixtures__/workflow-runs-fixtures'

describe('ResumeRun', () => {
  it('resumes a run that is waiting for an answer', async () => {
    const resumed: { runId: string; answer: string | boolean }[] = []
    const command = new ResumeRun({
      ...fakeWorkflowRuns(),
      resume: async (runId, _waiting, answer) => {
        resumed.push({ runId, answer })
        return {
          runId,
          status: 'success',
          createdAt: 4000,
          steps: {},
          result: undefined,
          error: undefined,
        }
      },
    })

    const result = await command.execute({ runId: 'issue-548', answer: 'Postgres' })

    expect(result).toStrictEqual({ runId: 'issue-548', status: 'success' })
    expect(resumed).toStrictEqual([{ runId: 'issue-548', answer: 'Postgres' }])
  })

  it('does not resume a run that is not waiting', async () => {
    const command = new ResumeRun(fakeWorkflowRuns())

    const result = await command.execute({ runId: 'issue-549', answer: 'anything' })

    expect(result).toStrictEqual({ runId: 'issue-549', status: 'success' })
  })

  it('reports a run that does not exist', async () => {
    const command = new ResumeRun(fakeWorkflowRuns())

    const result = await command.execute({ runId: 'issue-950', answer: 'anything' })

    expect(result).toStrictEqual({ runId: 'issue-950', status: 'missing' })
  })
})
