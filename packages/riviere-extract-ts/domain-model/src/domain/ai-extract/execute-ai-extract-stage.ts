import {
  parseAiExtractResponse,
  type AiExtractConfig,
} from '@living-architecture/riviere-extract-config-published-language'
import type { RiviereBuilder } from '@living-architecture/riviere-builder-published-language'
import type { RiviereProjectCollaborators } from '../ports/load-event-catalog-source'
import type { AiExtractSourceDiscovery } from '../ports/load-ai-extract-sources'
import type { WorkflowDiagnostic } from '../workflow-diagnostic'
import type { WorkflowRunMode, WorkflowWarning } from '../workflow'
import type { AiExtractGaps } from './compute-ai-extract-gaps'
import type { AiExtractSourceBatch } from './select-ai-extract-batches'
import type { AiExtractSourceFile } from '../ports/read-ai-extract-source-files'

type ExecuteAiExtractStageResult =
  | Readonly<{
      success: true
      diagnostics: readonly WorkflowDiagnostic[]
      warnings: readonly WorkflowWarning[]
      prompts?: readonly string[] | undefined
      collisions?: readonly string[] | undefined
      resolvedDiagnostics?: readonly WorkflowDiagnostic[] | undefined
    }>
  | Readonly<{ success: false; errorCode: string; reason: string; prompts?: readonly string[] }>

type ApplyBatchResult =
  | Readonly<{
      success: true
      warnings: readonly WorkflowWarning[]
      collisions: readonly string[]
      resolvedDiagnostics: readonly WorkflowDiagnostic[]
    }>
  | Readonly<{ success: false; errorCode: string; reason: string; prompts?: readonly string[] }>

type BatchAccumulator = Readonly<{
  prompts: readonly string[]
  warnings: readonly WorkflowWarning[]
  collisions: readonly string[]
  resolvedDiagnostics: readonly WorkflowDiagnostic[]
  unresolvedDiagnostics: readonly WorkflowDiagnostic[]
}>

type AiExtractPromptBatch = Readonly<{
  index: number
  files: readonly AiExtractSourceFile[]
}>

type AiExtractBatchState = Readonly<{
  config: AiExtractConfig
  collaborators: RiviereProjectCollaborators
  builder: RiviereBuilder
  discovery: AiExtractSourceDiscovery
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
    const discovery = await collaborators.loadAiExtractSources(config)
    if (discovery.missingPaths.length > 0) {
      return {
        success: false,
        errorCode: 'AI_EXTRACT_MISSING_SOURCE',
        reason: `ai-extract: configured paths do not exist: ${discovery.missingPaths.join(', ')}`,
      }
    }
    const batches = collaborators.extractionBehaviour.selectAiExtractBatches(
      config,
      discovery.filePaths,
    )
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
      discovery,
      unresolvedDiagnostics,
      batchCount: batches.batches.length,
    }
    if (mode.isDryRun()) {
      const prompts = await buildDryRunPrompts(state, batches.batches)
      return { success: true, diagnostics: [], warnings: [], prompts }
    }
    return await runAiExtractBatches(state, batches.batches, {
      prompts: [],
      warnings: [],
      collisions: [],
      resolvedDiagnostics: [],
      unresolvedDiagnostics,
    })
  } catch (error) {
    return {
      success: false,
      errorCode: 'AI_EXTRACT_FAILED',
      reason: `AI extract failed: ${String(error)}`,
    }
  }
}

async function buildDryRunPrompts(
  state: AiExtractBatchState,
  batches: readonly AiExtractSourceBatch[],
): Promise<readonly string[]> {
  const collected: string[] = []
  for (const batch of batches) {
    const files = await state.collaborators.readAiExtractSourceFiles(batch.filePaths)
    const promptBatch: AiExtractPromptBatch = { index: batch.index, files }
    collected.push(promptFor(state, promptBatch, state.unresolvedDiagnostics))
  }
  return collected
}

async function runAiExtractBatches(
  state: AiExtractBatchState,
  batches: readonly AiExtractSourceBatch[],
  accumulator: BatchAccumulator,
): Promise<ExecuteAiExtractStageResult> {
  const [batch, ...rest] = batches
  if (batch === undefined) {
    return {
      success: true,
      diagnostics: [],
      warnings: accumulator.warnings,
      prompts: accumulator.prompts,
      collisions: accumulator.collisions,
      resolvedDiagnostics: accumulator.resolvedDiagnostics,
    }
  }
  const availability = await state.collaborators.aiCli.checkAvailability(state.config.command)
  if (availability.kind === 'unavailable') {
    return {
      success: false,
      errorCode: 'AI_CLI_UNAVAILABLE',
      reason: availability.reason,
      prompts: accumulator.prompts,
    }
  }
  const files = await state.collaborators.readAiExtractSourceFiles(batch.filePaths)
  const promptBatch: AiExtractPromptBatch = { index: batch.index, files }
  const prompt = promptFor(state, promptBatch, accumulator.unresolvedDiagnostics)
  const result = await state.collaborators.aiCli.run({
    stageConfiguration: state.config,
    prompt,
  })
  if (result.kind === 'incomplete') {
    return {
      success: false,
      errorCode: 'AI_CLI_INCOMPLETE_RESPONSE',
      reason: result.reason,
      prompts: [...accumulator.prompts, prompt],
    }
  }
  if (result.kind === 'failed') {
    return {
      success: false,
      errorCode: 'AI_CLI_FAILED',
      reason: result.reason,
      prompts: [...accumulator.prompts, prompt],
    }
  }
  if (result.kind === 'timed-out') {
    return {
      success: false,
      errorCode: 'AI_CLI_TIMED_OUT',
      reason: `AI CLI '${state.config.command}' timed out after ${state.config.timeoutSeconds} seconds`,
      prompts: [...accumulator.prompts, prompt],
    }
  }
  const applied = applyBatchResponse(
    state,
    promptBatch,
    result.output,
    accumulator.unresolvedDiagnostics,
  )
  if (!applied.success) {
    return { ...applied, prompts: [...accumulator.prompts, prompt] }
  }
  const nextAccumulator: BatchAccumulator = {
    prompts: [...accumulator.prompts, prompt],
    warnings: [...accumulator.warnings, ...applied.warnings],
    collisions: [...accumulator.collisions, ...applied.collisions],
    resolvedDiagnostics: [...accumulator.resolvedDiagnostics, ...applied.resolvedDiagnostics],
    unresolvedDiagnostics: withoutResolved(
      accumulator.unresolvedDiagnostics,
      applied.resolvedDiagnostics,
    ),
  }
  return await runAiExtractBatches(state, rest, nextAccumulator)
}

function withoutResolved(
  diagnostics: readonly WorkflowDiagnostic[],
  resolved: readonly WorkflowDiagnostic[],
): readonly WorkflowDiagnostic[] {
  const resolvedIdentities = new Set(resolved.map((diagnostic) => diagnostic.identity()))
  return diagnostics.filter((diagnostic) => !resolvedIdentities.has(diagnostic.identity()))
}

function promptFor(
  state: AiExtractBatchState,
  batch: AiExtractPromptBatch,
  unresolvedDiagnostics: readonly WorkflowDiagnostic[],
): string {
  return state.collaborators.extractionBehaviour.buildAiExtractPrompt({
    repositoryName: state.collaborators.repositoryName,
    config: state.config,
    gaps: gapsForBatch(state, batch.files, unresolvedDiagnostics),
    batch,
    batchCount: state.batchCount,
    memoryContent: state.discovery.memoryContent,
    promptAppend: state.discovery.promptAppendContent,
  })
}

function gapsForBatch(
  state: AiExtractBatchState,
  files: readonly AiExtractSourceFile[],
  unresolvedDiagnostics: readonly WorkflowDiagnostic[],
): AiExtractGaps {
  return state.collaborators.extractionBehaviour.computeAiExtractGaps({
    config: state.config,
    components: state.builder.components(),
    links: state.builder.links(),
    unresolvedDiagnostics,
    files,
    builder: state.builder,
  })
}

function applyBatchResponse(
  state: AiExtractBatchState,
  batch: AiExtractPromptBatch,
  output: string,
  unresolvedDiagnostics: readonly WorkflowDiagnostic[],
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
      unresolvedDiagnostics,
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
