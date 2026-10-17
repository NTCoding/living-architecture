/**
 * Check 1. A step starts another workflow with mastra.getWorkflow(...).createRun(),
 * and .dountil() loops over that step.
 */
import { Mastra } from '@mastra/core'
import { createStep, createWorkflow } from '@mastra/core/workflows'
import { z } from 'zod'

const CycleState = z.object({ runId: z.string(), cycle: z.number().int() })

const innerStep = createStep({
  id: 'collect-verdicts',
  inputSchema: CycleState,
  outputSchema: CycleState,
  execute: async ({ inputData }) => ({ runId: inputData.runId, cycle: inputData.cycle + 1 }),
})

const inner = createWorkflow({
  id: 'review-cycle-spike',
  inputSchema: CycleState,
  outputSchema: CycleState,
})
  .then(innerStep)
  .commit()

const startsInner = createStep({
  id: 'review-cycle',
  inputSchema: CycleState,
  outputSchema: CycleState,
  execute: async ({ inputData, mastra }) => {
    const nested = mastra.getWorkflow('review-cycle-spike')
    const run = await nested.createRun({ runId: `${inputData.runId}-review-${inputData.cycle}` })
    const result = await run.start({ inputData })
    if (result.status !== 'success') {
      throw new Error(`nested run ended with ${result.status}`)
    }
    return result.result
  },
})

const parent = createWorkflow({
  id: 'start-implementation-spike',
  inputSchema: z.object({}),
  outputSchema: CycleState,
})
  .then(
    createStep({
      id: 'open-pull-request',
      inputSchema: z.object({}),
      outputSchema: CycleState,
      execute: async () => ({ runId: 'issue-455', cycle: 0 }),
    }),
  )
  .dountil(startsInner, async ({ inputData }) => inputData.cycle >= 3)
  .commit()

async function main() {
  new Mastra({
    workflows: { 'start-implementation-spike': parent, 'review-cycle-spike': inner },
    logger: false as never,
  })
  const run = await parent.createRun({ runId: 'issue-455' })
  const result = await run.start({ inputData: {} })

  if (result.status !== 'success') {
    console.error(JSON.stringify(result, null, 2).slice(0, 4000))
    throw new Error(`parent run ended with ${result.status}`)
  }
  const cycles = result.result.cycle
  console.log(`parent finished with cycle ${cycles}`)
  if (cycles !== 3) throw new Error(`expected three cycles, got ${cycles}`)
  console.log('CHECK 1 PASS: a step ran another workflow, and .dountil looped over it three times')
}

void main()
