import {
  workflow, type Step, type BaseContext, type WorkflowResult 
} from './workflow-runner'
import { handleWorkflowError } from './error-handler'

type ContextBuilder<T extends BaseContext> = () => Promise<T>
type ResultFormatter<T extends BaseContext> = (result: WorkflowResult, ctx: T) => unknown

export function runWorkflow<T extends BaseContext>(
  steps: Step<T>[],
  buildContext: ContextBuilder<T>,
  formatResult?: ResultFormatter<T>,
): void {
  executeWorkflow(steps, buildContext, formatResult).catch(handleWorkflowError)
}

async function executeWorkflow<T extends BaseContext>(
  steps: Step<T>[],
  buildContext: ContextBuilder<T>,
  formatResult?: ResultFormatter<T>,
): Promise<void> {
  const context = await buildContext()
  const runner = workflow(steps)
  const result = await runner(context)

  const output = formatResult ? formatResult(result, context) : (result.output ?? result)

  console.log(JSON.stringify(output, null, 2))

  process.exit(result.success ? 0 : 1)
}
