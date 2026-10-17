/**
 * Check 1b. The plan's graph puts a nested workflow step whose input and output
 * shapes differ inside .dountil(). This checks whether Mastra accepts that.
 */
import { Mastra } from '@mastra/core'
import { createStep, createWorkflow } from '@mastra/core/workflows'
import { z } from 'zod'

const CycleInput = z.object({ runId: z.string(), cycle: z.number().int() })
const CycleResult = z.object({ cycle: z.number().int(), verdicts: z.array(z.string()) })

const inner = createWorkflow({
  id: 'review-cycle-shape-spike',
  inputSchema: CycleInput,
  outputSchema: CycleResult,
})
  .then(
    createStep({
      id: 'collect',
      inputSchema: CycleInput,
      outputSchema: CycleResult,
      execute: async ({ inputData }) => ({ cycle: inputData.cycle + 1, verdicts: ['ok'] }),
    }),
  )
  .commit()

const nestedStep = createStep({
  id: 'review-cycle',
  inputSchema: CycleInput,
  outputSchema: CycleResult,
  execute: async ({ inputData, mastra }) => {
    const run = await mastra
      .getWorkflow('review-cycle-shape-spike')
      .createRun({ runId: `${inputData.runId}-review-${inputData.cycle}` })
    const result = await run.start({ inputData })
    if (result.status !== 'success') throw new Error(`nested run ended with ${result.status}`)
    return result.result
  },
})

const parent = createWorkflow({
  id: 'start-shape-spike',
  inputSchema: z.object({}),
  outputSchema: CycleResult,
})
  .then(
    createStep({
      id: 'open-pull-request',
      inputSchema: z.object({}),
      outputSchema: CycleInput,
      execute: async () => ({ runId: 'issue-455', cycle: 0 }),
    }),
  )
  .dountil(nestedStep, async ({ inputData }) => inputData.cycle >= 3)
  .commit()

async function main() {
  new Mastra({
    workflows: {
      'start-shape-spike': parent,
      'review-cycle-shape-spike': inner,
    },
    logger: false as never,
  })
  const run = await parent.createRun({ runId: 'issue-455-shape' })
  const result = await run.start({ inputData: {} })
  if (result.status !== 'success') {
    console.error(JSON.stringify(result.error, null, 2))
    throw new Error(`parent run ended with ${result.status}`)
  }
  console.log('result', JSON.stringify(result.result))
}

void main()
