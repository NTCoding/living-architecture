import { Command } from 'commander'
import type { RunWorkflow } from '@living-architecture/riviere-extract-ts-use-cases/features/extract/commands/run-workflow'

/** @riviere-role cli-entrypoint-dependencies */
export interface RunWorkflowEntrypointDependencies {
  readonly runWorkflow: Pick<RunWorkflow, 'execute'>
}

/** @riviere-role cli-entrypoint */
export function createRunWorkflowCommand(
  dependencies: RunWorkflowEntrypointDependencies,
): Command {
  return new Command('run')
    .description('Rebuild a graph from a named Rivière workflow')
    .argument('<workflow-name>', 'Workflow name from .riviere/workflows')
    .action((workflowName: string) => {
      const result = dependencies.runWorkflow.execute({ projectRoot: process.cwd(), workflowName })
      if (result.result.kind === 'success') {
        console.log(JSON.stringify(result.result))
        return
      }
      console.error(JSON.stringify(result.result))
      process.exitCode = 1
    })
}
