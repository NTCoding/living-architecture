import {
  parseAiExtractResponse,
  type AiExtractConfig,
} from '@living-architecture/riviere-extract-config-published-language'
import type { RiviereBuilder } from '@living-architecture/riviere-builder-published-language'
import type { RiviereProjectCollaborators } from '../ports/load-event-catalog-source'
import type { WorkflowDiagnostic } from '../workflow-diagnostic'
import type { WorkflowRunMode, WorkflowWarning } from '../workflow'
import { aiExtractGapContext } from './ai-extract-gap-context'
import { parseAiMemory } from './ai-extract-memory'
import { applyAiExtractResponse } from './apply-ai-extract-response'
import { buildAiExtractPrompt } from './build-ai-extract-prompt'
import { selectAiExtractBatches } from './select-ai-extract-batches'

type ExecuteAiExtractStageResult =
  | Readonly<{
      success: true
      diagnostics: readonly WorkflowDiagnostic[]
      warnings: readonly WorkflowWarning[]
      prompts?: readonly string[]
    }>
  | Readonly<{ success: false; errorCode: string; reason: string }>

async function executeAiExtractStage(
  builder: RiviereBuilder,
  config: AiExtractConfig,
  collaborators: RiviereProjectCollaborators,
  mode: WorkflowRunMode,
  unresolvedDiagnostics: readonly WorkflowDiagnostic[],
): Promise<ExecuteAiExtractStageResult> {
  try {
    const sources = collaborators.loadAiExtractSources(config)
    const batches = selectAiExtractBatches(config, sources.files)
    if (!batches.success) {
      return {
        success: false,
        errorCode: 'AI_EXTRACT_SOURCE_BOUND_EXCEEDED',
        reason: batches.reason,
      }
    }
    const memory = parseAiMemory(sources.memory)
    const context = aiExtractGapContext(
      builder.components(),
      builder.links(),
      unresolvedDiagnostics,
    )
    if (mode.isDryRun()) {
      return {
        success: true,
        diagnostics: [],
        warnings: [],
        prompts: batches.batches.map((batch) =>
          buildAiExtractPrompt({
            repositoryName: collaborators.repositoryName,
            config,
            context,
            batch,
            batchCount: batches.batches.length,
            memory,
            promptAppend: sources.promptAppend,
          }),
        ),
      }
    }
    const availability = await collaborators.aiCli.checkAvailability(config.command)
    if (availability.kind === 'unavailable') {
      return { success: false, errorCode: 'AI_CLI_UNAVAILABLE', reason: availability.reason }
    }
    const warnings: WorkflowWarning[] = []
    for (const batch of batches.batches) {
      const result = await collaborators.aiCli.run({
        stageConfiguration: config,
        prompt: buildAiExtractPrompt({
          repositoryName: collaborators.repositoryName,
          config,
          context,
          batch,
          batchCount: batches.batches.length,
          memory,
          promptAppend: sources.promptAppend,
        }),
      })
      if (result.kind === 'incomplete') {
        return { success: false, errorCode: 'AI_CLI_INCOMPLETE_RESPONSE', reason: result.reason }
      }
      if (result.kind === 'failed') {
        return { success: false, errorCode: 'AI_CLI_FAILED', reason: result.reason }
      }
      if (result.kind === 'timed-out') {
        return {
          success: false,
          errorCode: 'AI_CLI_TIMED_OUT',
          reason: `AI CLI '${config.command}' timed out after ${config.timeoutSeconds} seconds`,
        }
      }
      const parsed = parseAiExtractResponse(result.output)
      if (!parsed.success) {
        return {
          success: false,
          errorCode: 'AI_EXTRACT_MALFORMED_RESPONSE',
          reason: `AI response is not valid: ${parsed.issues.join('; ')}`,
        }
      }
      const applied = applyAiExtractResponse(builder, parsed.response, {
        repositoryName: collaborators.repositoryName,
        config,
        suppressedComponentIds: memory.suppressedComponentIds,
      })
      if (!applied.success) return applied
      warnings.push(...applied.warnings)
    }
    return { success: true, diagnostics: [], warnings }
  } catch (error) {
    return {
      success: false,
      errorCode: 'AI_EXTRACT_FAILED',
      reason: `AI extract failed: ${String(error)}`,
    }
  }
}

export { executeAiExtractStage }
export type { ExecuteAiExtractStageResult }
