import { ExtractionConfigError } from '../data-access/riviere-project/riviere-config-error'
import { ExtractionDataAccessError } from '../data-access/riviere-project/riviere-project-error'
import { RiviereProjectRepository } from '../data-access/riviere-project/riviere-project-repository'
import type { RunWorkflowInput } from './run-workflow-input'
import type { RunWorkflowResult } from './run-workflow-result'

/** @riviere-role command-use-case */
export class RunWorkflow {
  constructor(private readonly projects: RiviereProjectRepository) {}

  execute(input: RunWorkflowInput): Promise<RunWorkflowResult> {
    return this.run(input)
  }

  private async run(input: RunWorkflowInput): Promise<RunWorkflowResult> {
    try {
      const project = this.projects.load({ kind: 'workflow', workflowPath: input.workflowPath })
      return { result: await project.rebuildGraph() }
    } catch (error) {
      if (error instanceof ExtractionConfigError || error instanceof ExtractionDataAccessError) {
        return {
          result: {
            success: false,
            errorCode: error.code,
            reason: error.message,
            events: [],
            warnings: [],
          },
        }
      }
      throw error
    }
  }
}
