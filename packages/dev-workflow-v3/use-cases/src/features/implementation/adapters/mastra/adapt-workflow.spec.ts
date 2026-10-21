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
  retries: null,
  scoreWith: null,
  run: async ({ data }: { readonly data: unknown }) => data,
}

const plan = WorkflowPlan.parse({ id: 'counting', steps: [{ id: 'collect' }] })

const request = { plan, loopUntil: null, onFailure: null, onOutcome: null, steps: [declaration] }

describe('adaptWorkflowToMastra', () => {
  it('names the workflow after the plan', async () => {
    const { built } = await adaptWorkflowToMastra()(request)

    expect(built.id).toBe('counting')
  })

  it('rejects a plan with no steps to adapt', async () => {
    await expect(adaptWorkflowToMastra()({ ...request, steps: [] })).rejects.toThrow(
      'The workflow counting has a step with no behaviour.',
    )
  })

  it('rejects a step in the plan that has no behaviour', async () => {
    const longer = WorkflowPlan.parse({
      id: 'counting',
      steps: [{ id: 'collect' }, { id: 'report' }],
    })

    await expect(adaptWorkflowToMastra()({ ...request, plan: longer })).rejects.toThrow(
      'The workflow report has a step with no behaviour.',
    )
  })

  it('rejects a looped step when the workflow does not say when the loop ends', async () => {
    const looping = WorkflowPlan.parse({
      id: 'counting',
      steps: [{ id: 'collect', looped: true }],
    })

    await expect(adaptWorkflowToMastra()({ ...request, plan: looping })).rejects.toThrow(
      'The step collect loops but the workflow does not say when the loop ends.',
    )
  })

  it('scores a step that says how its work should be judged', async () => {
    const scored = { ...declaration, scoreWith: () => 1 }

    const { built } = await adaptWorkflowToMastra({ scoreShareOfRuns: 1 })({
      ...request,
      steps: [scored],
    })

    expect(Object.keys(await built.listScorers())).toStrictEqual(['collect-quality'])
  })
})
