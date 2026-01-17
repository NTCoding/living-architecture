import {
  workflow, type Step, type WorkflowContext 
} from './workflow-runner'
import { handleWorkflowError } from './error-handler'

type ContextBuilder = () => Promise<WorkflowContext>

export function runWorkflow(steps: Step[], buildContext: ContextBuilder): void {
  executeWorkflow(steps, buildContext).catch(handleWorkflowError)
}

async function executeWorkflow(steps: Step[], buildContext: ContextBuilder): Promise<void> {
  const context = await buildContext()
  const runner = workflow(steps)
  const result = await runner(context)

  // Print workflow output or full result
  const output = result.output === undefined ? result : result.output
  console.log(JSON.stringify(output, null, 2))

  process.exit(result.success ? 0 : 1)
}
