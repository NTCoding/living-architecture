import { resolve } from 'node:path'
import { ExtractionConfigError } from '../data-access/riviere-project/riviere-config-error'
import { ExtractionDataAccessError } from '../data-access/riviere-project/riviere-project-error'
import { RiviereProjectRepository } from '../data-access/riviere-project/riviere-project-repository'
import type { RunWorkflowInput } from './run-workflow-input'
import type { RunWorkflowResult } from './run-workflow-result'

/** @riviere-role command-use-case */
export class RunWorkflow {
  constructor(private readonly projects: RiviereProjectRepository) {}

  execute(input: RunWorkflowInput): RunWorkflowResult {
    try {
      const project = this.projects.load({
        kind: 'workflow',
        workflowPath: resolve(
          input.projectRoot,
          '.riviere',
          'workflows',
          `${input.workflowName}.yaml`,
        ),
      })
      return { result: project.rebuildGraph() }
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
