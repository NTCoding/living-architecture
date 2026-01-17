import {
  workflow, type Step 
} from '../workflow-runner/workflow-runner'
import { buildWorkflowContext } from './context-builder'
import { handleWorkflowError } from './error-handler'

export function runWorkflow(steps: Step[]): void {
  executeWorkflow(steps).catch(handleWorkflowError)
}

async function executeWorkflow(steps: Step[]): Promise<void> {
  const context = await buildWorkflowContext()
  const runner = workflow(steps)
  const result = await runner(context)

  console.log(JSON.stringify(result, null, 2))
  process.exit(result.success ? 0 : 1)
}
