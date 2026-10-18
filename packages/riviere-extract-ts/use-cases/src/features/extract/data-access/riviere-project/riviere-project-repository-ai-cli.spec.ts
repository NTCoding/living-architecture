import { afterEach, describe, expect, it } from 'vitest'
import { join } from 'node:path'
import {
  availableAiCli,
  createRiviereProjectRepository,
} from '../../../../__fixtures__/riviere-project-repository-fixtures'
import { writeAiExtractStage } from '../../../../__fixtures__/riviere-project-workflow-fixtures'
import {
  cleanupWorkflowWorkspaces,
  createWorkflowWorkspace,
} from '../../../../__fixtures__/riviere-project-workspace-fixtures'
import type { AiCli } from '@living-architecture/riviere-extract-ts-domain-model/domain/ports/ai-cli'
import { WorkflowRunMode } from '@living-architecture/riviere-extract-ts-domain-model/domain/workflow'

afterEach(cleanupWorkflowWorkspaces)

function aiCliWithAvailability(availability: Awaited<ReturnType<AiCli['checkAvailability']>>) {
  const commands: string[] = []
  const aiCli: AiCli = {
    checkAvailability: (command) => {
      commands.push(command)
      return Promise.resolve(availability)
    },
    run: () => Promise.reject(new AiCliRunNotExpected()),
  }
  return { aiCli, commands }
}

class AiCliRunNotExpected extends Error {}

describe('RiviereProjectRepository ai-cli collaborator injection', () => {
  it('validates every AI stage command through the injected AiCli port', async () => {
    const directory = createWorkflowWorkspace()
    writeAiExtractStage(directory)
    const { aiCli, commands } = aiCliWithAvailability({ kind: 'available' })
    const project = createRiviereProjectRepository(undefined, undefined, undefined, aiCli).load({
      kind: 'workflow',
      workflowPath: join(directory, '.riviere', 'workflows', 'combined.yaml'),
    })

    const result = await project.validateWorkflow()

    expect(result.value).toStrictEqual({ success: true, events: [], transitions: [], warnings: [] })
    expect(commands).toStrictEqual(['ai-cli'])
  })

  it('reports an unavailable AI stage command from the injected AiCli port', async () => {
    const directory = createWorkflowWorkspace()
    writeAiExtractStage(directory)
    const { aiCli } = aiCliWithAvailability({ kind: 'unavailable', reason: 'not installed' })
    const project = createRiviereProjectRepository(undefined, undefined, undefined, aiCli).load({
      kind: 'workflow',
      workflowPath: join(directory, '.riviere', 'workflows', 'combined.yaml'),
    })

    const result = await project.validateWorkflow()

    expect(result.value).toMatchObject({ success: false, errorCode: 'AI_CLI_UNAVAILABLE' })
  })

  it('checks the injected AiCli port before running an AI stage', async () => {
    const directory = createWorkflowWorkspace()
    writeAiExtractStage(directory)
    const { aiCli, commands } = aiCliWithAvailability({ kind: 'unavailable', reason: 'missing' })
    const project = createRiviereProjectRepository(undefined, undefined, undefined, aiCli).load({
      kind: 'workflow',
      workflowPath: join(directory, '.riviere', 'workflows', 'combined.yaml'),
    })

    const result = await project.rebuildGraph(WorkflowRunMode.from('run'))

    expect(result).toMatchObject({ success: false, errorCode: 'AI_CLI_UNAVAILABLE' })
    expect(commands).toStrictEqual(['ai-cli'])
  })

  it('does not consult the injected AiCli port when running with skip AI mode', async () => {
    const directory = createWorkflowWorkspace()
    writeAiExtractStage(directory)
    const { aiCli, commands } = aiCliWithAvailability({ kind: 'available' })
    const project = createRiviereProjectRepository(undefined, undefined, undefined, aiCli).load({
      kind: 'workflow',
      workflowPath: join(directory, '.riviere', 'workflows', 'combined.yaml'),
    })

    const result = await project.rebuildGraph(WorkflowRunMode.from('skip-ai'))

    expect(result.success).toBe(true)
    expect(commands).toStrictEqual([])
  })

  it('does not consult the injected AiCli port when running with dry run mode', async () => {
    const directory = createWorkflowWorkspace()
    writeAiExtractStage(directory)
    const { aiCli, commands } = aiCliWithAvailability({ kind: 'available' })
    const project = createRiviereProjectRepository(undefined, undefined, undefined, aiCli).load({
      kind: 'workflow',
      workflowPath: join(directory, '.riviere', 'workflows', 'combined.yaml'),
    })

    const result = await project.rebuildGraph(WorkflowRunMode.from('dry-run'))

    expect(result.success).toBe(true)
    expect(commands).toStrictEqual([])
  })

  it('keeps the default available AiCli port when none is supplied', async () => {
    const directory = createWorkflowWorkspace()
    writeAiExtractStage(directory)
    const project = createRiviereProjectRepository(
      undefined,
      undefined,
      undefined,
      availableAiCli(),
    ).load({
      kind: 'workflow',
      workflowPath: join(directory, '.riviere', 'workflows', 'combined.yaml'),
    })

    await expect(project.validateWorkflow()).resolves.toMatchObject({
      value: { success: true },
    })
  })
})
