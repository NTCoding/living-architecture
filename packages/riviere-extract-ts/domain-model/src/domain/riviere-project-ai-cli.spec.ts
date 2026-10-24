import type { AiExtractConfig } from '@living-architecture/riviere-extract-config-published-language'
import { assert, beforeEach, describe, expect, it, vi } from 'vitest'
import { RiviereBuilder } from '@living-architecture/riviere-builder-published-language'
import type { AiCli, AiCliAvailability } from './ports/ai-cli'
import type { LoadAiExtractSources } from './ports/load-ai-extract-sources'
import { RiviereProject, type RiviereProjectCollaborators } from './riviere-project'
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

const sourceFiles: LoadAiExtractSources = () =>
  Promise.resolve({
    files: [{ filePath: 'src/orders/checkout.ts', content: 'publish(orderPlaced)' }],
    missingPaths: [],
  })

const orderPlacedResponse = JSON.stringify({
  components: [
    {
      type: 'Event',
      name: 'OrderPlaced',
      domain: 'orders',
      module: 'orders',
      sourceLocation: { repository: 'shop', filePath: 'src/orders/checkout.ts' },
      eventName: 'order-placed',
    },
  ],
  links: [],
})

const available = (command: string): Promise<AiCliAvailability> =>
  Promise.resolve({ kind: 'available', command })

function projectWithCollaborators(
  stages: readonly WorkflowStage[],
  overrides: Partial<RiviereProjectCollaborators> = {},
): RiviereProject {
  return RiviereProject.start(
    GraphWithWorkflowStartInput.from(graphDefinition(), workflowStartInput(stages)),
    { ...collaborators(), ...overrides },
  )
}

function aiCliWithRun(run: AiCli['run']): AiCli {
  return { checkAvailability: available, run }
}

function completedRun(output: string): AiCli['run'] {
  return () => Promise.resolve({ kind: 'completed' as const, output })
}

function dryRunSubject(): { subject: RiviereProject; run: AiCli['run'] } {
  const run = vi.fn(completedRun(orderPlacedResponse))
  const subject = projectWithCollaborators(
    [WorkflowStage.fromAiExtract('discover', aiExtractConfig)],
    {
      aiCli: aiCliWithRun(run),
      loadAiExtractSources: sourceFiles,
    },
  )
  return { subject, run }
}

describe('RiviereProject AI CLI preflight', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('applies AI responses to the builder during a normal rebuild', async () => {
    const run = vi.fn(completedRun(orderPlacedResponse))
    const subject = projectWithCollaborators(
      [WorkflowStage.fromAiExtract('discover', aiExtractConfig)],
      {
        aiCli: aiCliWithRun(run),
        loadAiExtractSources: sourceFiles,
      },
    )

    const result = await subject.rebuildGraph(WorkflowRunMode.from('run'))

    assert(result.success)
    expect(run).toHaveBeenCalledTimes(1)
    expect(
      result.graph.components.some(
        (candidate) =>
          candidate.type === 'Event' &&
          candidate.name === 'OrderPlaced' &&
          candidate.eventName === 'order-placed',
      ),
    ).toBe(true)
  })

  it('checks the active AI command during a normal rebuild', async () => {
    const checkAvailability = vi.fn(available)
    const subject = projectWithCollaborators(
      [WorkflowStage.fromAiExtract('discover', aiExtractConfig)],
      { aiCli: aiCli({ checkAvailability }), loadAiExtractSources: sourceFiles },
    )

    const result = await subject.rebuildGraph(WorkflowRunMode.from('run'))

    expect(checkAvailability).toHaveBeenCalledWith('claude')
    expect(result).toMatchObject({ success: false, errorCode: 'AI_CLI_FAILED' })
  })

  it('fails with a typed error when the active AI command is unavailable', async () => {
    const subject = projectWithCollaborators(
      [WorkflowStage.fromAiExtract('discover', aiExtractConfig)],
      {
        aiCli: aiCli({
          checkAvailability: () =>
            Promise.resolve({
              kind: 'unavailable',
              command: 'claude',
              reason: 'spawn claude ENOENT',
            }),
        }),
      },
    )

    const result = await subject.rebuildGraph(WorkflowRunMode.from('run'))

    expect(result).toMatchObject({
      success: false,
      errorCode: 'AI_CLI_UNAVAILABLE',
      reason: 'spawn claude ENOENT',
    })
  })

  it('returns prompts without invoking the AI command during a dry run', async () => {
    const { subject, run } = dryRunSubject()

    const result = await subject.rebuildGraph(WorkflowRunMode.from('dry-run'))

    assert(result.success)
    expect(run).not.toHaveBeenCalled()
    expect(result.prompts).toHaveLength(1)
  })

  it('builds each dry-run prompt from gap instructions, the contract, and batch sources', async () => {
    const { subject } = dryRunSubject()

    const result = await subject.rebuildGraph(WorkflowRunMode.from('dry-run'))

    assert(result.success)
    const prompt = result.prompts?.[0]
    expect(prompt).toContain('missing-events')
    expect(prompt).toContain('Allowed component types: Event')
    expect(prompt).toContain('<source-file path="src/orders/checkout.ts">')
    expect(prompt).toContain('publish(orderPlaced)')
  })

  it('does not check the AI command in skip-ai mode', async () => {
    const checkAvailability = vi.fn(available)
    const subject = projectWithCollaborators(
      [WorkflowStage.fromAiExtract('discover', aiExtractConfig)],
      { aiCli: aiCli({ checkAvailability }) },
    )

    const result = await subject.rebuildGraph(WorkflowRunMode.from('skip-ai'))

    expect(checkAvailability).not.toHaveBeenCalled()
    expect(result).toMatchObject({ success: true })
  })

  it('preflights each distinct AI command once before running the workflow', async () => {
    const checkAvailability = vi.fn(available)
    const subject = projectWithCollaborators(
      [
        WorkflowStage.fromAiExtract('discover', aiExtractConfig),
        WorkflowStage.fromAiExtract('enrich', { ...aiExtractConfig, command: 'codex' }),
        WorkflowStage.fromAiExtract('enrich-again', aiExtractConfig),
      ],
      { aiCli: aiCli({ checkAvailability }), loadAiExtractSources: sourceFiles },
    )

    await subject.rebuildGraph(WorkflowRunMode.from('run'))

    expect(checkAvailability).toHaveBeenNthCalledWith(1, 'claude')
    expect(checkAvailability).toHaveBeenNthCalledWith(2, 'codex')
    expect(checkAvailability).toHaveBeenCalledTimes(3)
  })

  it('fails the stage when the AI command becomes unavailable after the preflight', async () => {
    const checkAvailability = vi.fn(
      (): Promise<AiCliAvailability> =>
        Promise.resolve({
          kind: 'unavailable',
          command: 'claude',
          reason: 'spawn claude ENOENT',
        }),
    )
    checkAvailability.mockImplementationOnce(() => available('claude'))
    const subject = projectWithCollaborators(
      [WorkflowStage.fromAiExtract('discover', aiExtractConfig)],
      { aiCli: aiCli({ checkAvailability }), loadAiExtractSources: sourceFiles },
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
      (): Promise<AiCliAvailability> =>
        Promise.resolve({
          kind: 'unavailable',
          command: 'claude',
          reason: 'spawn claude ENOENT',
        }),
    )
    const subject = projectWithCollaborators(
      [
        WorkflowStage.fromAiExtract('discover', aiExtractConfig),
        WorkflowStage.fromSchemaValidation('validate'),
      ],
      { aiCli: aiCli({ checkAvailability }) },
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
