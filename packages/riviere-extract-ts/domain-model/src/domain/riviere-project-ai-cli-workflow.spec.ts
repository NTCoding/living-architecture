import type {
  AiEnrichConfig,
  AiExtractConfig,
} from '@living-architecture/riviere-extract-config-published-language'
import { describe, expect, it, vi } from 'vitest'
import { RiviereProject, type RiviereProjectCollaborators } from './riviere-project'
import { WorkflowRunMode } from './workflow'
import { WorkflowStage } from './workflow-stage'
import {
  collaborators,
  graphDefinition,
  workflowStartInput,
} from './__fixtures__/workflow-fixtures'
import {
  GraphOnlyProjectStartInput,
  GraphWithWorkflowStartInput,
} from './riviere-project-start-inputs'

class UnexpectedAiCliRun extends Error {}

const aiExtractConfig: AiExtractConfig = {
  command: 'claude',
  args: ['-p'],
  timeoutSeconds: 60,
  sources: ['src'],
  selection: { from: ['missing-events'], componentTypes: ['Event'] },
  outputs: { addComponents: true, addLinks: true },
  context: { exclude: ['**/*.spec.ts'], maxFilesPerBatch: 10, maxBatches: 2 },
}

const aiEnrichConfig: AiEnrichConfig = {
  command: 'pi',
  args: [],
  timeoutSeconds: 30,
  sources: ['src'],
  selection: { componentTypes: ['Event'], missingFieldsOnly: true },
  fields: ['eventName'],
  context: { exclude: [], maxFilesPerComponent: 1 },
}

function project(
  stages?: readonly WorkflowStage[],
  aiCli?: RiviereProjectCollaborators['aiCli'],
): RiviereProject {
  if (stages === undefined) {
    return RiviereProject.start(GraphOnlyProjectStartInput.from(graphDefinition()), collaborators())
  }
  return RiviereProject.start(
    GraphWithWorkflowStartInput.from(graphDefinition(), workflowStartInput([...stages])),
    { ...collaborators(), ...(aiCli === undefined ? {} : { aiCli }) },
  )
}

describe('RiviereProject ai-cli workflow gating', () => {
  function unavailableAiCli(reason: string): RiviereProjectCollaborators['aiCli'] {
    return {
      checkAvailability: () => Promise.resolve({ kind: 'unavailable', reason }),
      run: () => Promise.reject(new UnexpectedAiCliRun()),
    }
  }

  function availableAiCli() {
    const checkAvailability = vi.fn(() => Promise.resolve({ kind: 'available' as const }))
    const run = vi.fn(() =>
      Promise.resolve({ kind: 'completed' as const, standardOutput: '', standardError: '' }),
    )
    return { checkAvailability, run }
  }

  it('checks every configured AI stage command when validating a workflow', async () => {
    const aiCli = availableAiCli()
    const subject = project(
      [
        WorkflowStage.fromAiExtract('discover', aiExtractConfig),
        WorkflowStage.fromAiExtract('review', { ...aiExtractConfig, command: 'opencode' }),
        WorkflowStage.fromAiEnrich('enrich', aiEnrichConfig),
        WorkflowStage.fromSchemaValidation('validate'),
      ],
      aiCli,
    )

    const result = await subject.validateWorkflow()

    expect(result.value).toStrictEqual({ success: true, events: [], transitions: [], warnings: [] })
    expect(aiCli.checkAvailability.mock.calls).toStrictEqual([['claude'], ['opencode'], ['pi']])
    expect(aiCli.run).not.toHaveBeenCalled()
  })

  it('reports every unavailable AI stage command when validating a workflow', async () => {
    const subject = project(
      [
        WorkflowStage.fromAiExtract('discover', aiExtractConfig),
        WorkflowStage.fromAiExtract('review', { ...aiExtractConfig, command: 'opencode' }),
      ],
      unavailableAiCli('not installed'),
    )

    const result = await subject.validateWorkflow()

    expect(result.value).toMatchObject({
      success: false,
      errorCode: 'AI_CLI_UNAVAILABLE',
      reason:
        "AI CLI 'claude' for stage 'discover' is unavailable: not installed\nAI CLI 'opencode' for stage 'review' is unavailable: not installed",
    })
  })

  it('reports a typed failure when validating without a workflow', async () => {
    const result = await project().validateWorkflow()

    expect(result.value).toMatchObject({ success: false, errorCode: 'WORKFLOW_UNAVAILABLE' })
  })

  it('checks the active AI command before running an AI stage', async () => {
    const aiCli = availableAiCli()
    const subject = project([WorkflowStage.fromAiExtract('discover', aiExtractConfig)], aiCli)

    const result = await subject.rebuildGraph()

    expect(result).toMatchObject({
      success: false,
      errorCode: 'STAGE_BEHAVIOUR_UNAVAILABLE',
    })
    expect(aiCli.checkAvailability.mock.calls).toStrictEqual([['claude']])
    expect(aiCli.run).not.toHaveBeenCalled()
  })

  it('reports an unavailable AI command before running an AI stage', async () => {
    const subject = project(
      [WorkflowStage.fromAiExtract('discover', aiExtractConfig)],
      unavailableAiCli('not installed'),
    )

    const result = await subject.rebuildGraph()

    expect(result).toMatchObject({
      success: false,
      errorCode: 'AI_CLI_UNAVAILABLE',
      reason: "AI CLI 'claude' is unavailable: not installed",
    })
  })

  it('does not check AI commands when running with skip AI mode', async () => {
    const aiCli = availableAiCli()
    const subject = project(
      [
        WorkflowStage.fromAiExtract('discover', aiExtractConfig),
        WorkflowStage.fromSchemaValidation('validate'),
      ],
      aiCli,
    )

    const result = await subject.rebuildGraph(WorkflowRunMode.from('skip-ai'))

    expect(result.success).toBe(true)
    expect(aiCli.checkAvailability).not.toHaveBeenCalled()
    expect(aiCli.run).not.toHaveBeenCalled()
  })

  it('does not check AI commands when running with dry run mode', async () => {
    const aiCli = availableAiCli()
    const subject = project(
      [
        WorkflowStage.fromAiExtract('discover', aiExtractConfig),
        WorkflowStage.fromSchemaValidation('validate'),
      ],
      aiCli,
    )

    const result = await subject.rebuildGraph(WorkflowRunMode.from('dry-run'))

    expect(result.success).toBe(true)
    expect(aiCli.checkAvailability).not.toHaveBeenCalled()
    expect(aiCli.run).not.toHaveBeenCalled()
  })
})
