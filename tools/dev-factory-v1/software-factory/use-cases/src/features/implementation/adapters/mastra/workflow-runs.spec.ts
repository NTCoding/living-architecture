import { describe, expect, it } from 'vitest'
import { workflowRunsWithMastra } from './workflow-runs'

type WorkflowRunsSource = Parameters<typeof workflowRunsWithMastra>[0]

const startedAt = new Date('2026-11-24T09:00:00Z')

function source(overrides: Partial<WorkflowRunsSource> = {}): WorkflowRunsSource {
  return {
    listRuns: async () => [
      {
        runId: 'issue-548',
        snapshot: { status: 'suspended', steps: { implement: [] } },
        createdAt: startedAt,
      },
    ],
    readState: async () => ({ status: 'success', steps: { implement: [] } }),
    startRun: async () => undefined,
    resumeRun: async () => undefined,
    ...overrides,
  }
}

describe('workflowRunsWithMastra', () => {
  it('lists the runs with their status and start time', async () => {
    const runs = workflowRunsWithMastra(source())

    expect(await runs.list(undefined)).toStrictEqual([
      {
        runId: 'issue-548',
        status: 'suspended',
        createdAt: startedAt.getTime(),
        steps: { implement: [] },
        result: undefined,
        error: undefined,
      },
    ])
  })

  it('passes a known status filter to the workflow', async () => {
    const asked: (string | undefined)[] = []
    const runs = workflowRunsWithMastra(
      source({
        listRuns: async (status) => {
          asked.push(status)
          return []
        },
      }),
    )

    await runs.list('suspended')

    expect(asked).toStrictEqual(['suspended'])
  })

  it('leaves out a status the workflow does not know', async () => {
    const asked: (string | undefined)[] = []
    const runs = workflowRunsWithMastra(
      source({
        listRuns: async (status) => {
          asked.push(status)
          return []
        },
      }),
    )

    await runs.list('nearly-done')

    expect(asked).toStrictEqual([undefined])
  })

  it('reads a run from the JSON snapshot the store keeps', async () => {
    const runs = workflowRunsWithMastra(
      source({ readState: async () => '{"status":"failed","steps":{}}' }),
    )

    const run = await runs.read('issue-548')

    expect(run?.status).toBe('failed')
    expect(run?.steps).toStrictEqual({})
  })

  it('reports an unknown status when the snapshot is not JSON', async () => {
    const runs = workflowRunsWithMastra(source({ readState: async () => 'not json' }))

    const run = await runs.read('issue-548')

    expect(run).toStrictEqual({
      runId: 'issue-548',
      status: 'unknown',
      createdAt: expect.any(Number),
      steps: {},
      result: undefined,
      error: undefined,
    })
  })

  it('reports an unknown status when the snapshot is JSON that is not an object', async () => {
    const runs = workflowRunsWithMastra(source({ readState: async () => '42' }))

    expect((await runs.read('issue-548'))?.status).toBe('unknown')
  })

  it('reports an unknown status when the state has no status', async () => {
    const runs = workflowRunsWithMastra(source({ readState: async () => ({ steps: {} }) }))

    expect((await runs.read('issue-548'))?.status).toBe('unknown')
  })

  it('reports no steps when the state is not an object', async () => {
    const runs = workflowRunsWithMastra(source({ readState: async () => undefined }))

    expect((await runs.read('issue-548'))?.steps).toStrictEqual({})
  })

  it('starts a run and reads it back', async () => {
    const started: Record<string, unknown>[] = []
    const runs = workflowRunsWithMastra(
      source({
        startRun: async (_runId, input) => {
          started.push(input)
          return undefined
        },
      }),
    )

    const run = await runs.start('issue-548', {
      issueNumber: 548,
      attempt: 1,
      model: 'a-model',
      thinking: 'high',
      reviewers: ['code-review'],
      worktreesDirectory: '/repo/.factory/worktrees',
    })

    expect(started).toStrictEqual([
      {
        issueNumber: 548,
        attempt: 1,
        model: 'a-model',
        thinking: 'high',
        reviewers: ['code-review'],
        worktreesDirectory: '/repo/.factory/worktrees',
      },
    ])
    expect(run.status).toBe('success')
  })

  it('answers the implementer question with the question it asked', async () => {
    const resumed: Record<string, unknown>[] = []
    const runs = workflowRunsWithMastra(
      source({
        resumeRun: async (_runId, options) => {
          resumed.push(options)
          return undefined
        },
      }),
    )

    await runs.resume(
      'issue-548',
      { kind: 'implementer-question', question: 'Which database?' },
      'Postgres',
    )

    expect(resumed).toStrictEqual([
      { step: 'implement', resumeData: { answer: 'Postgres', question: 'Which database?' } },
    ])
  })

  it('continues the feedback step without an answer', async () => {
    const resumed: Record<string, unknown>[] = []
    const runs = workflowRunsWithMastra(
      source({
        resumeRun: async (_runId, options) => {
          resumed.push(options)
          return undefined
        },
      }),
    )

    await runs.resume(
      'issue-548',
      { kind: 'feedback-question', reason: 'Stuck.', unaddressed: [1] },
      false,
    )

    expect(resumed).toStrictEqual([{ step: 'address-feedback' }])
  })

  it('sends an empty answer when the question carries no text', async () => {
    const resumed: Record<string, unknown>[] = []
    const runs = workflowRunsWithMastra(
      source({
        resumeRun: async (_runId, options) => {
          resumed.push(options)
          return undefined
        },
      }),
    )

    await runs.resume('issue-548', { kind: 'implementer-question', question: '' }, true)

    expect(resumed).toStrictEqual([{ step: 'implement', resumeData: { answer: '', question: '' } }])
  })
})
