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

  it('resumes a plan clarification with the answer', async () => {
    const resumed: { waiting: unknown; answer: string | boolean }[] = []
    const command = new ResumeRun({
      ...fakeWorkflowRuns(),
      read: async () => ({
        runId: 'issue-550',
        status: 'suspended',
        createdAt: 2500,
        result: undefined,
        error: undefined,
        steps: {
          'wait-for-plan-clarification': [
            { status: 'suspended', suspendPayload: { question: 'Bytes or lines?' } },
          ],
        },
      }),
      resume: async (runId, waiting, answer) => {
        resumed.push({ waiting, answer })
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

    const result = await command.execute({ runId: 'issue-550', answer: 'Bytes, 64 KiB.' })

    expect(result).toStrictEqual({ runId: 'issue-550', status: 'success' })
    expect(resumed).toStrictEqual([
      {
        waiting: { kind: 'plan-question', question: 'Bytes or lines?' },
        answer: 'Bytes, 64 KiB.',
      },
    ])
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
