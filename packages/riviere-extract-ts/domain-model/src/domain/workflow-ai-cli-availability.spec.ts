import type {
  AiEnrichConfig,
  AiExtractConfig,
  AsyncApiImportConfig,
  EventCatalogImportConfig,
} from '@living-architecture/riviere-extract-config-published-language'
import { describe, expect, it } from 'vitest'
import type { AiCli, AiCliAvailability } from './ports/ai-cli'
import { RiviereProject } from './riviere-project'
import {
  GraphOnlyProjectStartInput,
  GraphWithWorkflowStartInput,
} from './riviere-project-start-inputs'
import { WorkflowRunMode } from './workflow'
import { WorkflowStage } from './workflow-stage'
import {
  collaborators,
  configuration,
  graphDefinition,
  workflowStartInput,
} from './__fixtures__/workflow-fixtures'

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
  command: 'other-ai',
  args: ['-p'],
  timeoutSeconds: 60,
  sources: ['src'],
  selection: { componentTypes: ['Event'], missingFieldsOnly: true },
  fields: ['eventName'],
  context: { exclude: ['**/*.spec.ts'], maxFilesPerComponent: 10 },
}

const eventCatalogConfig: EventCatalogImportConfig = {
  source: '/specs/eventcatalog',
  sourceFilePath: 'specs/eventcatalog',
  allowUnmapped: false,
  mappings: { domains: {}, services: {}, events: {} },
}

const asyncApiConfig: AsyncApiImportConfig = {
  source: '/specs/asyncapi.yaml',
  sourceFilePath: 'specs/asyncapi.yaml',
  allowUnmapped: false,
  mappings: { messages: {}, operations: {} },
}

function workflowWithEveryStageKind(): readonly WorkflowStage[] {
  return [
    WorkflowStage.fromCodeExtraction('extract', configuration().resolvedConfig, 'extraction.yml'),
    WorkflowStage.fromEventCatalogImport('eventcatalog', eventCatalogConfig),
    WorkflowStage.fromAsyncApiImport('asyncapi', asyncApiConfig),
    WorkflowStage.fromAiExtract('discover', aiExtractConfig),
    WorkflowStage.fromAiEnrich('enrich', aiEnrichConfig),
    WorkflowStage.fromSchemaValidation('validate'),
  ]
}

function recordingAiCli(availability: AiCliAvailability = { kind: 'available' }): Readonly<{
  aiCli: AiCli
  commands: string[]
}> {
  const commands: string[] = []
  return {
    aiCli: {
      checkAvailability: (command) => {
        commands.push(command)
        return availability
      },
      run: () => ({ kind: 'invocation-failure', reason: 'not configured' }),
    },
    commands,
  }
}

function projectWithAiCli(aiCli: AiCli, stages = workflowWithEveryStageKind()): RiviereProject {
  return RiviereProject.start(
    GraphWithWorkflowStartInput.from(graphDefinition(), workflowStartInput(stages)),
    {
      ...collaborators(),
      aiCli,
    },
  )
}

describe('Workflow AI CLI availability', () => {
  it('checks every configured AI stage command and ignores non-AI stages', () => {
    const recording = recordingAiCli()
    const subject = projectWithAiCli(recording.aiCli)

    const result = subject.checkConfiguredAiCliAvailability()

    expect(result).toStrictEqual({ success: true })
    expect(recording.commands).toStrictEqual(['claude', 'other-ai'])
  })

  it('reports the first unavailable configured AI command', () => {
    const recording = recordingAiCli({ kind: 'unavailable', reason: 'spawn claude ENOENT' })
    const subject = projectWithAiCli(recording.aiCli)

    const result = subject.checkConfiguredAiCliAvailability()

    expect(result).toStrictEqual({
      success: false,
      command: 'claude',
      reason: 'spawn claude ENOENT',
    })
    expect(recording.commands).toStrictEqual(['claude'])
  })

  it('checks active AI stage commands for a normal run', () => {
    const recording = recordingAiCli()
    const subject = projectWithAiCli(recording.aiCli)

    const result = subject.checkActiveAiCliAvailability(WorkflowRunMode.from('run'))

    expect(result).toStrictEqual({ success: true })
    expect(recording.commands).toStrictEqual(['claude', 'other-ai'])
  })

  it.each(['skip-ai', 'dry-run'] as const)(
    'performs no AI availability check when the run mode is %s',
    (mode) => {
      const recording = recordingAiCli()
      const subject = projectWithAiCli(recording.aiCli)

      const result = subject.checkActiveAiCliAvailability(WorkflowRunMode.from(mode))

      expect(result).toStrictEqual({ success: true })
      expect(recording.commands).toStrictEqual([])
    },
  )

  it('performs no AI availability check when no workflow is loaded', () => {
    const recording = recordingAiCli()
    const subject = RiviereProject.start(GraphOnlyProjectStartInput.from(graphDefinition()), {
      ...collaborators(),
      aiCli: recording.aiCli,
    })

    const result = subject.checkConfiguredAiCliAvailability()

    expect(result).toStrictEqual({ success: true })
    expect(recording.commands).toStrictEqual([])
  })

  it('performs no active AI availability check when no workflow is loaded', () => {
    const recording = recordingAiCli()
    const subject = RiviereProject.start(GraphOnlyProjectStartInput.from(graphDefinition()), {
      ...collaborators(),
      aiCli: recording.aiCli,
    })

    const result = subject.checkActiveAiCliAvailability(WorkflowRunMode.from('run'))

    expect(result).toStrictEqual({ success: true })
    expect(recording.commands).toStrictEqual([])
  })
})
