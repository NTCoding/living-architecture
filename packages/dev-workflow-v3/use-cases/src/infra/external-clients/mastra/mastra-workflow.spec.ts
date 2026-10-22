import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { createMastraWorkflow, mastraRunFailure } from './mastra-workflow'

const stateSchema = z.object({ count: z.number() })

describe('createMastraWorkflow', () => {
  it('rejects a workflow with no steps', () => {
    expect(() =>
      createMastraWorkflow({
        id: 'empty',
        inputSchema: stateSchema,
        outputSchema: stateSchema,
        entries: [],
        onFailure: null,
        onOutcome: null,
      }),
    ).toThrow('The workflow empty has no steps.')
  })

  it('passes on what the run said about its failure', () => {
    const failure = mastraRunFailure({
      error: { message: 'gh rejected the push' },
      runId: 'issue-455',
      workflowId: 'start-implementation',
      getInitData: () => ({ issueNumber: 455 }),
    })

    expect(failure).toStrictEqual({
      workflowId: 'start-implementation',
      runId: 'issue-455',
      message: 'gh rejected the push',
      startedWith: { issueNumber: 455 },
    })
  })

  it('says the run gave no reason when the failure carries none', () => {
    const failure = mastraRunFailure({
      runId: 'issue-455',
      workflowId: 'start-implementation',
      getInitData: () => null,
    })

    expect(failure.message).toBe('The run stopped without saying why.')
  })
})
