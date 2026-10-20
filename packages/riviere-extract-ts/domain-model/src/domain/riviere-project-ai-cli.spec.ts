import type { AiExtractConfig } from '@living-architecture/riviere-extract-config-published-language'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RiviereBuilder } from '@living-architecture/riviere-builder-published-language'
import type { AiCli, AiCliAvailability } from './ports/ai-cli'
import { RiviereProject } from './riviere-project'
import { WorkflowRunMode } from './workflow'
import { WorkflowStage } from './workflow-stage'
import {
  aiCli,
  collaborators,
  graphDefinition,
  workflowStartInput,
} from './__fixtures__/workflow-fixtures'
import { GraphWithWorkflowStartInput } from './riviere-project-start-inputs'

const aiExtractConfig: AiExtractConfig = {
  command: 'claude',
  args: ['-p'],
  timeoutSeconds: 60,
  sources: ['src'],
  selection: { from: ['missing-events'], componentTypes: ['Event'] },
  outputs: { addComponents: true, addLinks: true },
  context: { exclude: ['**/*.spec.ts'], maxFilesPerBatch: 10, maxBatches: 2 },
}

function project(stages: readonly WorkflowStage[]): RiviereProject {
  return RiviereProject.start(
    GraphWithWorkflowStartInput.from(graphDefinition(), workflowStartInput(stages)),
    collaborators(),
  )
}

function projectWithAiCli(
  stages: readonly WorkflowStage[],
  checkAvailability: AiCli['checkAvailability'],
): RiviereProject {
  return RiviereProject.start(
    GraphWithWorkflowStartInput.from(graphDefinition(), workflowStartInput(stages)),
    { ...collaborators(), aiCli: aiCli({ checkAvailability }) },
  )
}

describe('RiviereProject AI CLI preflight', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('executes AI stages during a normal Project rebuild', async () => {
    const subject = project([WorkflowStage.fromAiExtract('discover', aiExtractConfig)])

    const result = await subject.rebuildGraph(WorkflowRunMode.from('run'))

    expect(result).toMatchObject({
      success: false,
      errorCode: 'STAGE_BEHAVIOUR_UNAVAILABLE',
      reason: "Stage behaviour is unavailable for 'ai-extract'",
    })
  })

  it('checks the active AI command during a normal Project rebuild', async () => {
    const checkAvailability = vi.fn(
      (command: string): Promise<AiCliAvailability> =>
        Promise.resolve({ kind: 'available', command }),
    )
    const subject = projectWithAiCli(
      [WorkflowStage.fromAiExtract('discover', aiExtractConfig)],
      checkAvailability,
    )

    const result = await subject.rebuildGraph(WorkflowRunMode.from('run'))

    expect(checkAvailability).toHaveBeenCalledWith('claude')
    expect(result).toMatchObject({ success: false, errorCode: 'STAGE_BEHAVIOUR_UNAVAILABLE' })
  })

  it('fails with a typed error when the active AI command is unavailable', async () => {
    const subject = projectWithAiCli(
      [WorkflowStage.fromAiExtract('discover', aiExtractConfig)],
      () =>
        Promise.resolve({
          kind: 'unavailable',
          command: 'claude',
          reason: 'spawn claude ENOENT',
        }),
    )

    const result = await subject.rebuildGraph(WorkflowRunMode.from('run'))

    expect(result).toMatchObject({
      success: false,
      errorCode: 'AI_CLI_UNAVAILABLE',
      reason: 'spawn claude ENOENT',
    })
  })

  it('does not check the AI command during a dry run', async () => {
    const checkAvailability = vi.fn(
      (command: string): Promise<AiCliAvailability> =>
        Promise.resolve({ kind: 'available', command }),
    )
    const subject = projectWithAiCli(
      [WorkflowStage.fromAiExtract('discover', aiExtractConfig)],
      checkAvailability,
    )

    const result = await subject.rebuildGraph(WorkflowRunMode.from('dry-run'))

    expect(checkAvailability).not.toHaveBeenCalled()
    expect(result).toMatchObject({ success: false, errorCode: 'STAGE_BEHAVIOUR_UNAVAILABLE' })
  })

  it('does not check the AI command in skip-ai mode', async () => {
    const checkAvailability = vi.fn(
      (command: string): Promise<AiCliAvailability> =>
        Promise.resolve({ kind: 'available', command }),
    )
    const subject = projectWithAiCli(
      [WorkflowStage.fromAiExtract('discover', aiExtractConfig)],
      checkAvailability,
    )

    const result = await subject.rebuildGraph(WorkflowRunMode.from('skip-ai'))

    expect(checkAvailability).not.toHaveBeenCalled()
    expect(result).toMatchObject({ success: true })
  })

  it('preflights each distinct AI command once before running the workflow', async () => {
    const checkAvailability = vi.fn(
      (command: string): Promise<AiCliAvailability> =>
        Promise.resolve({ kind: 'available', command }),
    )
    const subject = projectWithAiCli(
      [
        WorkflowStage.fromAiExtract('discover', aiExtractConfig),
        WorkflowStage.fromAiExtract('enrich', { ...aiExtractConfig, command: 'codex' }),
        WorkflowStage.fromAiExtract('enrich-again', aiExtractConfig),
      ],
      checkAvailability,
    )

    await subject.rebuildGraph(WorkflowRunMode.from('run'))

    expect(checkAvailability).toHaveBeenNthCalledWith(1, 'claude')
    expect(checkAvailability).toHaveBeenNthCalledWith(2, 'codex')
    expect(checkAvailability).toHaveBeenCalledTimes(3)
  })

  it('fails the stage when the AI command becomes unavailable after the preflight', async () => {
    const checkAvailability = vi.fn(
      (_command: string): Promise<AiCliAvailability> =>
        Promise.resolve({
          kind: 'unavailable',
          command: 'claude',
          reason: 'spawn claude ENOENT',
        }),
    )
    checkAvailability.mockImplementationOnce((_command: string) =>
      Promise.resolve<AiCliAvailability>({ kind: 'available', command: 'claude' }),
    )
    const subject = projectWithAiCli(
      [WorkflowStage.fromAiExtract('discover', aiExtractConfig)],
      checkAvailability,
    )

    const result = await subject.rebuildGraph(WorkflowRunMode.from('run'))

    expect(checkAvailability).toHaveBeenCalledTimes(2)
    expect(result).toMatchObject({
      success: false,
      errorCode: 'AI_CLI_UNAVAILABLE',
      reason: 'spawn claude ENOENT',
    })
  })

  it('fails the rebuild before any stage runs when the AI command is unavailable', async () => {
    const checkAvailability = vi.fn(
      (_command: string): Promise<AiCliAvailability> =>
        Promise.resolve({
          kind: 'unavailable',
          command: 'claude',
          reason: 'spawn claude ENOENT',
        }),
    )
    const subject = projectWithAiCli(
      [
        WorkflowStage.fromAiExtract('discover', aiExtractConfig),
        WorkflowStage.fromSchemaValidation('validate'),
      ],
      checkAvailability,
    )
    const validateSpy = vi.spyOn(RiviereBuilder.prototype, 'validate')

    const result = await subject.rebuildGraph(WorkflowRunMode.from('run'))

    expect(checkAvailability).toHaveBeenCalledTimes(1)
    expect(validateSpy).not.toHaveBeenCalled()
    expect(result).toMatchObject({
      success: false,
      errorCode: 'AI_CLI_UNAVAILABLE',
      reason: 'spawn claude ENOENT',
    })
  })
})
