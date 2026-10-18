import { WorkflowRunMode } from '@living-architecture/riviere-extract-ts-domain-model/domain/workflow'
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
    const parsedMode = WorkflowRunMode.parse(input.mode)
    if (!parsedMode.success) return validationFailure(parsedMode.reason)
    try {
      const project = this.projects.load({ kind: 'workflow', workflowPath: input.workflowPath })
      const availability = project.checkActiveAiCliAvailability(parsedMode.mode)
      if (!availability.success) {
        return {
          result: {
            success: false,
            errorCode: 'AI_CLI_UNAVAILABLE',
            reason: `AI CLI '${availability.command}' is unavailable: ${availability.reason}`,
            events: [],
            warnings: [],
          },
        }
      }
      return { result: await project.rebuildGraph(parsedMode.mode) }
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

function validationFailure(reason: string): RunWorkflowResult {
  return {
    result: {
      success: false,
      errorCode: 'VALIDATION_ERROR',
      reason,
      events: [],
      warnings: [],
    },
  }
}
