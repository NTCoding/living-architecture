import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { WorkflowPlan } from '@living-architecture/dev-workflow-v3-domain-model'
import { adaptWorkflowToMastra } from './adapt-workflow'

const stateSchema = z.object({ count: z.number() })

const declaration = {
  id: 'collect',
  inputSchema: stateSchema,
  outputSchema: stateSchema,
  suspendSchema: null,
  resumeSchema: null,
  run: async ({ data }: { readonly data: unknown }) => data,
}

const plan = WorkflowPlan.parse({ id: 'counting', steps: [{ id: 'collect', looped: false }] })

describe('adaptWorkflowToMastra', () => {
  it('names the workflow after the plan', async () => {
    const { built } = await adaptWorkflowToMastra()({ plan, loopUntil: null, steps: [declaration] })

    expect(built.id).toBe('counting')
  })

  it('rejects a plan with no steps to adapt', async () => {
    await expect(adaptWorkflowToMastra()({ plan, loopUntil: null, steps: [] })).rejects.toThrow(
      'The workflow counting has a step with no behaviour.',
    )
  })

  it('rejects a step in the plan that has no behaviour', async () => {
    const longer = WorkflowPlan.parse({
      id: 'counting',
      steps: [
        { id: 'collect', looped: false },
        { id: 'report', looped: false },
      ],
    })

    await expect(
      adaptWorkflowToMastra()({ plan: longer, loopUntil: null, steps: [declaration] }),
    ).rejects.toThrow('The workflow report has a step with no behaviour.')
  })
})
