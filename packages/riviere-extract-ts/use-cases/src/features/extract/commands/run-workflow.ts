import type { GraphBuilder } from '@living-architecture/riviere-extract-ts-domain-model/domain/ports/graph-builder'
import type { WorkflowState } from '@living-architecture/riviere-extract-ts-domain-model/domain/workflow-state'
import { RiviereProjectRepository } from '../data-access/riviere-project/riviere-project-repository'
import { ExtractionConfigError } from '../data-access/riviere-project/riviere-config-error'
import { ExtractionDataAccessError } from '../data-access/riviere-project/riviere-project-error'
import type { RunWorkflowInput } from './run-workflow-input'
import type { RunWorkflowResult } from './run-workflow-result'

type CreateGraphBuilder = (graph: WorkflowState['graph']) => GraphBuilder

/** @riviere-role command-use-case */
export class RunWorkflow {
  constructor(
    private readonly riviereProjectRepository: RiviereProjectRepository,
    private readonly createGraphBuilder: CreateGraphBuilder,
  ) {}

  execute(input: RunWorkflowInput): RunWorkflowResult {
    try {
      const project = this.riviereProjectRepository.load(input)
      const workflow = project.workflowState
      if (workflow === undefined) {
        throw new ExtractionConfigError('VALIDATION_ERROR', 'Loaded workflow is missing workflow state')
      }
      const result = project.rebuildGraph(this.createGraphBuilder(workflow.graph))
      if (!result.ok) {
        return {
          result: {
            kind: 'extractionFailure',
            reason: result.failure.reason,
            failedFields: result.failure.failedFields,
          },
        }
      }
      return {
        result: {
          kind: 'success',
          graph: result.graph,
          outputPath: workflow.graph.outputPath,
          runLogDirectory: workflow.runLogDirectory,
        },
      }
    } catch (error) {
      if (error instanceof ExtractionConfigError) {
        return { result: { kind: 'configFailure', code: error.code, message: error.message } }
      }
      if (error instanceof ExtractionDataAccessError) {
        return {
          result: { kind: 'dataAccessFailure', code: error.code, message: error.message },
        }
      }
      throw error
    }
  }
}
