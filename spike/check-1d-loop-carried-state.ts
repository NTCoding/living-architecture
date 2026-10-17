/**
 * Check 1d. The looped step's output carries everything the next step needs,
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
  id: 'review-cycle-d-spike',
  inputSchema: CycleState,
  outputSchema: CycleState,
})
  .then(
    createStep({
      id: 'collect',
      inputSchema: CycleState,
      outputSchema: CycleState,
      execute: async ({ inputData }) => ({
        runId: inputData.runId,
        cycle: inputData.cycle + 1,
        verdicts: [...inputData.verdicts, `verdict for cycle ${inputData.cycle + 1}`],
      }),
    }),
  )
  .commit()

const nestedStep = createStep({
  id: 'review-cycle',
  inputSchema: CycleState,
  outputSchema: CycleState,
  execute: async ({ inputData, mastra }) => {
    const run = await mastra
      .getWorkflow('review-cycle-d-spike')
      .createRun({ runId: `${inputData.runId}-review-${inputData.cycle}` })
    const result = await run.start({ inputData })
    if (result.status !== 'success') {
      console.error(JSON.stringify(result.error, null, 2))
      throw new Error(`nested run ended with ${result.status}`)
    }
    return result.result
  },
})

const parent = createWorkflow({
  id: 'start-d-spike',
  inputSchema: z.object({}),
  outputSchema: CycleState,
})
  .then(
    createStep({
      id: 'open-pull-request',
      inputSchema: z.object({}),
      outputSchema: CycleState,
      execute: async () => ({ runId: 'issue-455', cycle: 0, verdicts: [] }),
    }),
  )
  .dountil(nestedStep, async ({ inputData }) => inputData.cycle >= 3)
  .commit()

async function main() {
  new Mastra({
    workflows: { 'start-d-spike': parent, 'review-cycle-d-spike': inner },
    logger: false as never,
  })
  const run = await parent.createRun({ runId: 'issue-455-d' })
  const result = await run.start({ inputData: {} })
  if (result.status !== 'success') {
    console.error(JSON.stringify(result.error, null, 2))
    throw new Error(`parent run ended with ${result.status}`)
  }
  console.log('final output:', JSON.stringify(result.result))
  console.log('verdicts carried in the loop:', JSON.stringify(result.result.verdicts))
  if (result.result.verdicts.length !== 3)
    throw new Error('the verdicts did not accumulate across cycles')
  console.log(
    'CHECK 1d PASS: the cycle state travelled through the loop, so each cycle could be rebuilt from the step input',
  )
}

void main()
