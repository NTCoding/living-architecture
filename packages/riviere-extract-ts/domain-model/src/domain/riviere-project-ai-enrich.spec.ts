import type { AiEnrichConfig } from '@living-architecture/riviere-extract-config-published-language'
import { describe, expect, it, vi } from 'vitest'
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

const aiEnrichConfig: AiEnrichConfig = {
  command: 'claude',
  args: ['-p'],
  timeoutSeconds: 60,
  sources: ['src'],
  selection: { componentTypes: ['Event'], missingFieldsOnly: true },
  fields: ['eventName'],
  context: { exclude: ['**/*.spec.ts'], maxFilesPerComponent: 10 },
}

function projectWithCollaborators(
  stages: readonly WorkflowStage[],
  overrides: Partial<RiviereProjectCollaborators> = {},
): RiviereProject {
  return RiviereProject.start(
    GraphWithWorkflowStartInput.from(graphDefinition(), workflowStartInput(stages)),
    { ...collaborators(), ...overrides },
  )
}

describe('RiviereProject ai-enrich stage', () => {
  it('returns STAGE_BEHAVIOUR_UNAVAILABLE during a dry run', async () => {
    const subject = projectWithCollaborators([WorkflowStage.fromAiEnrich('enrich', aiEnrichConfig)])
    const result = await subject.rebuildGraph(WorkflowRunMode.from('dry-run'))
    expect(result).toMatchObject({ success: false, errorCode: 'STAGE_BEHAVIOUR_UNAVAILABLE' })
  })

  it('returns AI_CLI_UNAVAILABLE when the command is missing', async () => {
    const checkAvailability = vi.fn(async () => ({
      kind: 'unavailable' as const,
      command: 'claude',
      reason: 'spawn claude ENOENT',
    }))
    const subject = projectWithCollaborators(
      [WorkflowStage.fromAiEnrich('enrich', aiEnrichConfig)],
      { aiCli: aiCli({ checkAvailability }) },
    )
    const result = await subject.rebuildGraph(WorkflowRunMode.from('run'))
    expect(result).toMatchObject({
      success: false,
      errorCode: 'AI_CLI_UNAVAILABLE',
      reason: 'spawn claude ENOENT',
    })
  })

  it('returns STAGE_BEHAVIOUR_UNAVAILABLE when the command is available', async () => {
    const checkAvailability = vi.fn(async () => ({ kind: 'available' as const, command: 'claude' }))
    const subject = projectWithCollaborators(
      [WorkflowStage.fromAiEnrich('enrich', aiEnrichConfig)],
      { aiCli: aiCli({ checkAvailability }) },
    )
    const result = await subject.rebuildGraph(WorkflowRunMode.from('run'))
    expect(result).toMatchObject({ success: false, errorCode: 'STAGE_BEHAVIOUR_UNAVAILABLE' })
  })
})
