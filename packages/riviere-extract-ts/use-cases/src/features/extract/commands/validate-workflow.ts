import { ExtractionConfigError } from '../data-access/riviere-project/riviere-config-error'
import { ExtractionDataAccessError } from '../data-access/riviere-project/riviere-project-error'
import { RiviereProjectRepository } from '../data-access/riviere-project/riviere-project-repository'
import type { ValidateWorkflowInput } from './validate-workflow-input'
import type { ValidateWorkflowResult } from './validate-workflow-result'
import { WorkflowRunResult } from '@living-architecture/riviere-extract-ts-domain-model/domain/workflow'

/** @riviere-role command-use-case */
export class ValidateWorkflow {
  constructor(private readonly projects: RiviereProjectRepository) {}

  execute(input: ValidateWorkflowInput): Promise<ValidateWorkflowResult> {
    return this.validate(input)
  }

  private async validate(input: ValidateWorkflowInput): Promise<ValidateWorkflowResult> {
    try {
      const project = this.projects.load({ kind: 'workflow', workflowPath: input.workflowPath })
      return { result: await project.validateWorkflow() }
    } catch (error) {
      if (error instanceof ExtractionConfigError || error instanceof ExtractionDataAccessError) {
        return {
          result: WorkflowRunResult.from({
            success: false,
            errorCode: error.code,
            reason: error.message,
            events: [],
            transitions: [],
            warnings: [],
          }),
        }
      }
      throw error
    }
  }
}
