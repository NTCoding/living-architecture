import { ExtractionConfigError } from '../data-access/riviere-project/riviere-config-error'
import { ExtractionDataAccessError } from '../data-access/riviere-project/riviere-project-error'
import { RiviereProjectRepository } from '../data-access/riviere-project/riviere-project-repository'
import type { ValidateWorkflowInput } from './validate-workflow-input'
import type { ValidateWorkflowResult } from './validate-workflow-result'

/** @riviere-role command-use-case */
export class ValidateWorkflow {
  constructor(private readonly projects: RiviereProjectRepository) {}

  execute(input: ValidateWorkflowInput): ValidateWorkflowResult {
    try {
      const project = this.projects.load({
        kind: 'workflow',
        workflowPath: input.workflowPath,
      })
      const availability = project.checkConfiguredAiCliAvailability()
      if (!availability.success) {
        return {
          result: {
            success: false,
            errorCode: 'AI_CLI_UNAVAILABLE',
            reason: `AI CLI '${availability.command}' is unavailable: ${availability.reason}`,
          },
        }
      }
      return { result: { success: true } }
    } catch (error) {
      if (error instanceof ExtractionConfigError || error instanceof ExtractionDataAccessError) {
        return {
          result: { success: false, errorCode: error.code, reason: error.message },
        }
      }
      throw error
    }
  }
}
