/**
 * Check 1c. The looped step's output carries everything the next step needs,
 * and its input schema is the smaller shape it needs to run. Every iteration
 * therefore validates, and the data is not lost.
 */
import { Mastra } from '@mastra/core'
import { createStep, createWorkflow } from '@mastra/core/workflows'
import { z } from 'zod'

const CycleInput = z.object({ runId: z.string(), cycle: z.number().int() })
const CycleState = z.object({
  runId: z.string(),
  cycle: z.number().int(),
  verdicts: z.array(z.string()),
})

const inner = createWorkflow({
  id: 'review-cycle-c-spike',
  inputSchema: CycleInput,
  outputSchema: CycleState,
})
  .then(
    createStep({
      id: 'collect',
      inputSchema: CycleInput,
      outputSchema: CycleState,
      execute: async ({ inputData }) => ({
        runId: inputData.runId,
        cycle: inputData.cycle + 1,
        verdicts: [`verdict for cycle ${inputData.cycle + 1}`],
      }),
    }),
  )
  .commit()

const nestedStep = createStep({
  id: 'review-cycle',
  inputSchema: CycleInput,
  outputSchema: CycleState,
  execute: async ({ inputData, mastra }) => {
    const run = await mastra
      .getWorkflow('review-cycle-c-spike')
      .createRun({ runId: `${inputData.runId}-review-${inputData.cycle}` })
    const result = await run.start({ inputData })
    if (result.status !== 'success') throw new Error(`nested run ended with ${result.status}`)
    return result.result
  },
})

const parent = createWorkflow({
  id: 'start-c-spike',
  inputSchema: z.object({}),
  outputSchema: CycleState,
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
    workflows: { 'start-c-spike': parent, 'review-cycle-c-spike': inner },
    logger: false as never,
  })
  const run = await parent.createRun({ runId: 'issue-455-c' })
  const result = await run.start({ inputData: {} })
  if (result.status !== 'success') {
    console.error(JSON.stringify(result.error, null, 2))
    throw new Error(`parent run ended with ${result.status}`)
  }
  console.log('final output:', JSON.stringify(result.result))
  if (result.result.verdicts.length !== 1)
    throw new Error('the last verdict did not survive the loop')
  console.log(
    'CHECK 1c PASS: a looped nested step kept a wider output than its input, and the loop still validated',
  )
}

void main()
