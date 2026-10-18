import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { createMastraWorkflow } from './mastra-workflow'

const stateSchema = z.object({ count: z.number() })

describe('createMastraWorkflow', () => {
  it('rejects a workflow with no steps', () => {
    expect(() =>
      createMastraWorkflow({
        id: 'empty',
        inputSchema: stateSchema,
        outputSchema: stateSchema,
        steps: [],
        loopedStepId: null,
        loopUntil: null,
      }),
    ).toThrow('The workflow empty has no steps.')
  })
})
