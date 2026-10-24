import {
  parseAiExtractResponse,
  type AiExtractConfig,
} from '@living-architecture/riviere-extract-config-published-language'
import type { RiviereBuilder } from '@living-architecture/riviere-builder-published-language'
import type { RiviereProjectCollaborators } from '../ports/load-event-catalog-source'
import type { AiExtractSourceBundle } from '../ports/load-ai-extract-sources'
import type { WorkflowDiagnostic } from '../workflow-diagnostic'
import type { WorkflowRunMode, WorkflowWarning } from '../workflow'
import type { AiExtractGaps } from './compute-ai-extract-gaps'
import type {
  AiExtractSourceBatch,
  SelectAiExtractBatchesResult,
} from './select-ai-extract-batches'

type ExecuteAiExtractStageResult =
  | Readonly<{
      success: true
      diagnostics: readonly WorkflowDiagnostic[]
      warnings: readonly WorkflowWarning[]
      prompts?: readonly string[] | undefined
      collisions?: readonly string[] | undefined
      resolvedDiagnostics?: readonly WorkflowDiagnostic[] | undefined
    }>
  | Readonly<{ success: false; errorCode: string; reason: string }>

type ApplyBatchResult =
  | Readonly<{
      success: true
      warnings: readonly WorkflowWarning[]
      collisions: readonly string[]
      resolvedDiagnostics: readonly WorkflowDiagnostic[]
    }>
  | Readonly<{ success: false; errorCode: string; reason: string }>

type AiExtractBatchState = Readonly<{
  config: AiExtractConfig
  collaborators: RiviereProjectCollaborators
  builder: RiviereBuilder
  bundle: AiExtractSourceBundle
  unresolvedDiagnostics: readonly WorkflowDiagnostic[]
  batchCount: number
}>

/**
 * @riviere-role domain-service
 * @riviere-role-justification Executes the AI extraction stage over loaded external facts and the Builder passed in, performing I/O through domain ports and returning typed diagnostics and warnings. RiviereProject owns the decision to run the stage and supplies its Builder and collaborators.
 */
export async function executeAiExtractStage(
  builder: RiviereBuilder,
  config: AiExtractConfig,
  collaborators: RiviereProjectCollaborators,
  mode: WorkflowRunMode,
  unresolvedDiagnostics: readonly WorkflowDiagnostic[],
): Promise<ExecuteAiExtractStageResult> {
  try {
    const bundle = await collaborators.loadAiExtractSources(config)
    if (bundle.missingPaths.length > 0) {
      return {
        success: false,
        errorCode: 'AI_EXTRACT_MISSING_SOURCE',
        reason: `ai-extract: configured paths do not exist: ${bundle.missingPaths.join(', ')}`,
      }
    }
    const batches = collaborators.extractionBehaviour.selectAiExtractBatches(config, bundle.files)
    if (!batches.success) {
      return {
        success: false,
        errorCode: 'AI_EXTRACT_SOURCE_BOUND_EXCEEDED',
        reason: batches.reason,
      }
    }
    const state: AiExtractBatchState = {
      config,
      collaborators,
      builder,
      bundle,
      unresolvedDiagnostics,
      batchCount: batches.batches.length,
    }
    if (mode.isDryRun()) {
      return {
        success: true,
        diagnostics: [],
        warnings: [],
        prompts: batches.batches.map((batch) => promptFor(state, batch)),
      }
    }
    return await runAiExtractBatches(state, batches)
  } catch (error) {
    return {
      success: false,
      errorCode: 'AI_EXTRACT_FAILED',
      reason: `AI extract failed: ${String(error)}`,
    }
  }
}

function promptFor(state: AiExtractBatchState, batch: AiExtractSourceBatch): string {
  return state.collaborators.extractionBehaviour.buildAiExtractPrompt({
    repositoryName: state.collaborators.repositoryName,
    config: state.config,
    gaps: gapsForBatch(state, batch.files),
    batch,
    batchCount: state.batchCount,
    memoryContent: state.bundle.memoryContent,
    promptAppend: state.bundle.promptAppendContent,
  })
}

function gapsForBatch(
  state: AiExtractBatchState,
  files: AiExtractSourceBundle['files'],
): AiExtractGaps {
  return state.collaborators.extractionBehaviour.computeAiExtractGaps({
    config: state.config,
    components: state.builder.components(),
    links: state.builder.links(),
    unresolvedDiagnostics: state.unresolvedDiagnostics,
    files,
  })
}

async function runAiExtractBatches(
  state: AiExtractBatchState,
  batches: Extract<SelectAiExtractBatchesResult, { success: true }>,
): Promise<ExecuteAiExtractStageResult> {
  const warnings: WorkflowWarning[] = []
  const collisions: string[] = []
  const resolvedDiagnostics: WorkflowDiagnostic[] = []
  const prompts: string[] = []
  for (const batch of batches.batches) {
    const availability = await state.collaborators.aiCli.checkAvailability(state.config.command)
    if (availability.kind === 'unavailable') {
      return { success: false, errorCode: 'AI_CLI_UNAVAILABLE', reason: availability.reason }
    }
    const prompt = promptFor(state, batch)
    prompts.push(prompt)
    const result = await state.collaborators.aiCli.run({
      stageConfiguration: state.config,
      prompt,
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
        reason: `AI CLI '${state.config.command}' timed out after ${state.config.timeoutSeconds} seconds`,
      }
    }
    const applied = applyBatchResponse(state, batch, result.output)
    if (!applied.success) return applied
    warnings.push(...applied.warnings)
    collisions.push(...applied.collisions)
    resolvedDiagnostics.push(...applied.resolvedDiagnostics)
  }
  return { success: true, diagnostics: [], warnings, prompts, collisions, resolvedDiagnostics }
}

function applyBatchResponse(
  state: AiExtractBatchState,
  batch: AiExtractSourceBatch,
  output: string,
): ApplyBatchResult {
  const parsed = parseAiExtractResponse(output)
  if (!parsed.success) {
    return {
      success: false,
      errorCode: 'AI_EXTRACT_MALFORMED_RESPONSE',
      reason: `AI response is not valid: ${parsed.issues.join('; ')}`,
    }
  }
  const validation = state.collaborators.extractionBehaviour.validateAiExtractResponse({
    response: parsed.response,
    config: state.config,
    builder: state.builder,
    repositoryName: state.collaborators.repositoryName,
    sourcePaths: batch.files.map((file) => file.filePath),
  })
  if (!validation.success) {
    return { success: false, errorCode: validation.errorCode, reason: validation.reason }
  }
  const applied = state.collaborators.extractionBehaviour.applyAiExtractResponse(
    state.builder,
    validation.response,
    {
      repositoryName: state.collaborators.repositoryName,
      unresolvedDiagnostics: state.unresolvedDiagnostics,
    },
  )
  return {
    success: true,
    warnings: applied.warnings,
    collisions: applied.collisions,
    resolvedDiagnostics: applied.resolvedDiagnostics,
  }
}

export type { ExecuteAiExtractStageResult }
