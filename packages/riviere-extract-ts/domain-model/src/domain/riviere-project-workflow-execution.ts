import type { RiviereBuilder } from '@living-architecture/riviere-builder-published-language'
import type { WorkflowStageValue } from './workflow-stage'
import type { WorkflowDiagnostic } from './workflow-diagnostic'
import type { WorkflowRunMode, WorkflowStageExecutionResult, AiCliWorkflowStage } from './workflow'
import type { RiviereProjectCollaborators } from './ports/load-event-catalog-source'

type CodeExtractionWorkflowStage = Extract<WorkflowStageValue, { kind: 'code-extraction' }>

type WorkflowStageExecutionInput = Readonly<{
  builder: RiviereBuilder
  collaborators: RiviereProjectCollaborators
  stage: WorkflowStageValue
  unresolvedDiagnostics: readonly WorkflowDiagnostic[]
  mode: WorkflowRunMode
  executeCodeExtractionStage: (stage: CodeExtractionWorkflowStage) => WorkflowStageExecutionResult
}>

/**
 * @riviere-role domain-service
 * @riviere-role-justification Executing a Workflow stage coordinates graph building with several external capabilities; no aggregate or value object owns that coordination because the closed Workflow stage vocabulary is evaluated against the Project's graph state.
 */
export class WorkflowStageExecution {
  static async execute(input: WorkflowStageExecutionInput): Promise<WorkflowStageExecutionResult> {
    const { stage } = input
    switch (stage.kind) {
      case 'schema-validate':
        return schemaValidationResult(input)
      case 'eventcatalog-import':
        return input.collaborators.extractionBehaviour.executeEventCatalogImportStage(
          input.builder,
          stage.config,
          input.collaborators,
        )
      case 'asyncapi-import':
        return input.collaborators.extractionBehaviour.executeAsyncApiImportStage(
          input.builder,
          stage.config,
          input.collaborators,
        )
      case 'code-extraction':
        return input.executeCodeExtractionStage(stage)
      case 'ai-extract':
      case 'ai-enrich':
        if (input.mode.value === 'dry-run') return stageBehaviourUnavailable(stage)
        return executeAiCliStage(input, stage)
    }
  }
}

function schemaValidationResult(input: WorkflowStageExecutionInput): WorkflowStageExecutionResult {
  const validation = input.builder.validate()
  if (!validation.valid)
    return {
      success: false,
      errorCode: 'GRAPH_VALIDATION_FAILED',
      reason: [
        ...validation.errors.map((error) => error.message),
        ...input.unresolvedDiagnostics.map((diagnostic) => diagnostic.describe()),
      ].join('\n'),
    }
  if (input.unresolvedDiagnostics.length > 0)
    return {
      success: false,
      errorCode: 'UNRESOLVED_WORKFLOW_DIAGNOSTICS',
      reason: `Unresolved workflow diagnostics: ${input.unresolvedDiagnostics
        .map((diagnostic) => diagnostic.describe())
        .join(', ')}`,
    }
  return { success: true, diagnostics: [], warnings: [] }
}

async function executeAiCliStage(
  input: WorkflowStageExecutionInput,
  stage: AiCliWorkflowStage,
): Promise<WorkflowStageExecutionResult> {
  const availability = await input.collaborators.aiCli.checkAvailability(stage.config.command)
  if (availability.kind === 'unavailable')
    return {
      success: false,
      errorCode: 'AI_CLI_UNAVAILABLE',
      reason: aiCliUnavailableReason(stage.name, stage.kind, stage.config.command),
    }
  return stageBehaviourUnavailable(stage)
}

function stageBehaviourUnavailable(stage: WorkflowStageValue): WorkflowStageExecutionResult {
  return {
    success: false,
    errorCode: 'STAGE_BEHAVIOUR_UNAVAILABLE',
    reason: `Stage behaviour is unavailable for '${stage.kind}'`,
  }
}

function aiCliUnavailableReason(
  stageName: string,
  stageKind: AiCliWorkflowStage['kind'],
  command: string,
): string {
  return `Stage '${stageName}' (${stageKind}) requires the '${command}' CLI, but it is not installed or not in PATH`
}

export type { WorkflowStageExecutionInput }
