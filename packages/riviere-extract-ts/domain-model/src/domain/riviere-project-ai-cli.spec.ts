import type {
  AiEnrichConfig,
  AiExtractConfig,
} from '@living-architecture/riviere-extract-config-published-language'
import { describe, expect, it, vi } from 'vitest'
import { RiviereProject } from './riviere-project'
import type { AiCli } from './ports/ai-cli'
import { WorkflowUnavailableError } from './riviere-project-errors'
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
  command: 'codex',
  args: ['--prompt', '{prompt}'],
  timeoutSeconds: 30,
  sources: ['src'],
  selection: { componentTypes: ['Event'], missingFieldsOnly: true },
  fields: ['eventName'],
  context: { exclude: ['**/*.spec.ts'], maxFilesPerComponent: 5 },
}

const emptyAiOutput = { text: '', truncated: false } as const

function availableAiCli(checkAvailability: AiCli['checkAvailability']): AiCli {
  return {
    checkAvailability,
    run: () =>
      Promise.resolve({
        kind: 'failed-to-launch',
        reason: 'not used',
        stdout: emptyAiOutput,
        stderr: emptyAiOutput,
      }),
  }
}

function projectWithAiCli(stages: readonly WorkflowStage[], aiCli: AiCli): RiviereProject {
  return RiviereProject.start(
    GraphWithWorkflowStartInput.from(graphDefinition(), workflowStartInput(stages)),
    { ...collaborators(), aiCli },
  )
}

describe('RiviereProject AI CLI boundary', () => {
  it('fails a normal rebuild when the active AI command is unavailable', async () => {
    const checkAvailability = vi.fn<AiCli['checkAvailability']>()
    checkAvailability.mockResolvedValue({
      kind: 'unavailable',
      command: 'claude',
      reason: "'claude' is not installed or not in PATH",
    })
    const subject = projectWithAiCli(
      [WorkflowStage.fromAiExtract('discover', aiExtractConfig)],
      availableAiCli(checkAvailability),
    )

    const result = await subject.rebuildGraph(WorkflowRunMode.from('run'))

    expect(checkAvailability).toHaveBeenCalledWith('claude')
    expect(result).toMatchObject({
      success: false,
      errorCode: 'AI_CLI_UNAVAILABLE',
      reason:
        "Stage 'discover' (ai-extract) requires the 'claude' CLI, but it is not installed or not in PATH",
    })
  })

  it('checks no AI command during a dry run', async () => {
    const checkAvailability = vi.fn<AiCli['checkAvailability']>()
    const subject = projectWithAiCli(
      [WorkflowStage.fromAiExtract('discover', aiExtractConfig)],
      availableAiCli(checkAvailability),
    )

    const result = await subject.rebuildGraph(WorkflowRunMode.from('dry-run'))

    expect(checkAvailability).not.toHaveBeenCalled()
    expect(result).toMatchObject({ success: false, errorCode: 'STAGE_BEHAVIOUR_UNAVAILABLE' })
  })

  it('checks no AI command when AI stages are skipped', async () => {
    const checkAvailability = vi.fn<AiCli['checkAvailability']>()
    const subject = projectWithAiCli(
      [WorkflowStage.fromAiExtract('discover', aiExtractConfig)],
      availableAiCli(checkAvailability),
    )

    const result = await subject.rebuildGraph(WorkflowRunMode.from('skip-ai'))

    expect(checkAvailability).not.toHaveBeenCalled()
    expect(result).toMatchObject({ success: true })
  })

  it('reports every configured AI stage whose command is unavailable', async () => {
    const checkAvailability = vi.fn<AiCli['checkAvailability']>()
    checkAvailability.mockImplementation((command) =>
      Promise.resolve(
        command === 'claude'
          ? { kind: 'unavailable', command, reason: "'claude' is not installed or not in PATH" }
          : { kind: 'available' },
      ),
    )
    const subject = projectWithAiCli(
      [
        WorkflowStage.fromAiExtract('discover', aiExtractConfig),
        WorkflowStage.fromAiEnrich('enrich', aiEnrichConfig),
      ],
      availableAiCli(checkAvailability),
    )

    const result = await subject.checkAiCliAvailability()

    expect(checkAvailability).toHaveBeenCalledTimes(2)
    expect(result).toStrictEqual([
      {
        stageName: 'discover',
        stageKind: 'ai-extract',
        command: 'claude',
        reason: "'claude' is not installed or not in PATH",
      },
    ])
  })

  it('reports no unavailable AI stage when every configured command is available', async () => {
    const checkAvailability = vi.fn<AiCli['checkAvailability']>()
    checkAvailability.mockResolvedValue({ kind: 'available' })
    const subject = projectWithAiCli(
      [
        WorkflowStage.fromAiExtract('discover', aiExtractConfig),
        WorkflowStage.fromSchemaValidation('validate'),
      ],
      availableAiCli(checkAvailability),
    )

    const result = await subject.checkAiCliAvailability()

    expect(result).toStrictEqual([])
  })

  it('rejects an AI availability check when no workflow is loaded', async () => {
    const subject = RiviereProject.start(
      GraphOnlyProjectStartInput.from(graphDefinition()),
      collaborators(),
    )

    await expect(subject.checkAiCliAvailability()).rejects.toThrow(WorkflowUnavailableError)
  })
})
