import { Command, Option } from 'commander'
import type { RunWorkflow } from '@living-architecture/riviere-extract-ts-use-cases/features/extract/commands/run-workflow'
import type { ValidateWorkflow } from '@living-architecture/riviere-extract-ts-use-cases/features/extract/commands/validate-workflow'
import type {
  formatRunWorkflowResult,
  formatValidateWorkflowResult,
} from './workflow-output-formatter'
import type { writeCliOutput } from '../../../../infra/cli/presentation/output-writer'

interface WorkflowRunOptions {
  readonly dryRun?: boolean
  readonly skipAi?: boolean
}

/** @riviere-role cli-entrypoint-dependencies */
export interface CreateWorkflowCommandEntrypointDependencies {
  readonly formatRunWorkflowResult: typeof formatRunWorkflowResult
  readonly formatValidateWorkflowResult: typeof formatValidateWorkflowResult
  readonly runWorkflow: Pick<RunWorkflow, 'execute'>
  readonly validateWorkflow: Pick<ValidateWorkflow, 'execute'>
  readonly writeCliOutput: typeof writeCliOutput
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
        dependencies.writeCliOutput(dependencies.formatValidateWorkflowResult(result))
      }),
  )
  workflow.addCommand(
    new Command('run')
      .description('Run a workflow')
      .argument('<workflow-path>', 'Path to the workflow file')
      .addOption(
        new Option('--skip-ai', 'Remove AI stages from the active plan').conflicts('dryRun'),
      )
      .addOption(
        new Option('--dry-run', 'Return AI prompts without invoking or applying them').conflicts(
          'skipAi',
        ),
      )
      .action(async (workflowPath: string, options: WorkflowRunOptions) => {
        const result = await dependencies.runWorkflow.execute({
          workflowPath,
          skipAi: options.skipAi === true,
          dryRun: options.dryRun === true,
        })
        dependencies.writeCliOutput(dependencies.formatRunWorkflowResult(result))
      }),
  )
  return workflow
}
