import { Command } from 'commander'
import type { RunWorkflow } from '@living-architecture/riviere-extract-ts-use-cases/features/extract/commands/run-workflow'
import type { ValidateWorkflow } from '@living-architecture/riviere-extract-ts-use-cases/features/extract/commands/validate-workflow'

interface WorkflowRunOptions {
  readonly dryRun?: boolean
  readonly skipAi?: boolean
}

/** @riviere-role cli-entrypoint-dependencies */
export interface CreateWorkflowCommandEntrypointDependencies {
  readonly runWorkflow: Pick<RunWorkflow, 'execute'>
  readonly validateWorkflow: Pick<ValidateWorkflow, 'execute'>
}

/** @riviere-role entrypoint-cli-input-parser */
export function parseWorkflowRunMode(options: WorkflowRunOptions): 'run' | 'skip-ai' | 'dry-run' {
  if (options.skipAi === true) return 'skip-ai'
  if (options.dryRun === true) return 'dry-run'
  return 'run'
}

/** @riviere-role cli-entrypoint */
export function createWorkflowCommand(
  dependencies: CreateWorkflowCommandEntrypointDependencies,
): Command {
  const workflow = new Command('workflow').description('Validate and run a Rivière workflow')
  workflow.addCommand(
    new Command('validate')
      .description('Validate a workflow and its configured capabilities')
      .argument('<workflow-path>', 'Path to the workflow file')
      .action((workflowPath: string) => {
        const result = dependencies.validateWorkflow.execute({ workflowPath })
        if (!result.result.success) {
          console.error(`${result.result.errorCode}: ${result.result.reason}`)
          process.exitCode = 1
          return
        }
        console.log('Workflow is valid')
      }),
  )
  workflow.addCommand(
    new Command('run')
      .description('Run a workflow')
      .argument('<workflow-path>', 'Path to the workflow file')
      .option('--skip-ai', 'Remove AI stages from the active plan')
      .option('--dry-run', 'Return AI prompts without invoking or applying them')
      .action(async (workflowPath: string, options: WorkflowRunOptions) => {
        const mode = parseWorkflowRunMode(options)
        const result = await dependencies.runWorkflow.execute({ workflowPath, mode })
        if (!result.result.success) {
          console.error(`${result.result.errorCode}: ${result.result.reason}`)
          process.exitCode = 1
          return
        }
        console.log(`Workflow completed: ${result.result.outputPath}`)
      }),
  )
  return workflow
}
