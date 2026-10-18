import { afterEach, describe, expect, it, vi } from 'vitest'
import { join } from 'node:path'
import { createRiviereProjectRepository } from '../../../__fixtures__/riviere-project-repository-fixtures'
import { writeAiExtractStage } from '../../../__fixtures__/riviere-project-workflow-fixtures'
import {
  cleanupWorkflowWorkspaces,
  createWorkflowWorkspace,
} from '../../../__fixtures__/riviere-project-workspace-fixtures'
import type { AiCli } from '@living-architecture/riviere-extract-ts-domain-model/domain/ports/ai-cli'
import { WorkflowRunMode } from '@living-architecture/riviere-extract-ts-domain-model/domain/workflow'
import { RunWorkflow } from './run-workflow'
import { ValidateWorkflow } from './validate-workflow'
import { ExtractionConfigError } from '../data-access/riviere-project/riviere-config-error'
import { ExtractionDataAccessError } from '../data-access/riviere-project/riviere-project-error'

afterEach(cleanupWorkflowWorkspaces)

function workflowPath(directory: string): string {
  return join(directory, '.riviere', 'workflows', 'combined.yaml')
}

function recordingAiCli(availability: Awaited<ReturnType<AiCli['checkAvailability']>>) {
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

class UnexpectedWorkflowLoadFailure extends Error {}

describe('ValidateWorkflow ai-cli availability command', () => {
  it('reports success when every AI stage command is available', async () => {
    const directory = createWorkflowWorkspace()
    writeAiExtractStage(directory)
    const { aiCli, commands } = recordingAiCli({ kind: 'available' })
    const command = new ValidateWorkflow(
      createRiviereProjectRepository(undefined, undefined, undefined, aiCli),
    )

    const result = await command.execute({ workflowPath: workflowPath(directory) })

    expect(result.result.value).toStrictEqual({
      success: true,
      events: [],
      transitions: [],
      warnings: [],
    })
    expect(commands).toStrictEqual(['ai-cli'])
  })

  it.each([
    new ExtractionConfigError('VALIDATION_ERROR', 'Invalid workflow'),
    new ExtractionDataAccessError('FILE_READ_ERROR', 'Cannot read workflow'),
  ])('returns typed workflow loading failures', async (error) => {
    const repository = createRiviereProjectRepository()
    vi.spyOn(repository, 'load').mockImplementation(() => {
      throw error
    })
    const command = new ValidateWorkflow(repository)

    const result = await command.execute({ workflowPath: 'missing.yaml' })

    expect(result.result.value).toMatchObject({
      success: false,
      errorCode: error.code,
      reason: error.message,
    })
  })

  it('does not hide unexpected workflow loading failures', async () => {
    const repository = createRiviereProjectRepository()
    vi.spyOn(repository, 'load').mockImplementation(() => {
      throw new UnexpectedWorkflowLoadFailure('unexpected')
    })
    const command = new ValidateWorkflow(repository)

    await expect(command.execute({ workflowPath: 'missing.yaml' })).rejects.toThrow(
      UnexpectedWorkflowLoadFailure,
    )
  })

  it('reports the unavailable AI stage command', async () => {
    const directory = createWorkflowWorkspace()
    writeAiExtractStage(directory)
    const { aiCli } = recordingAiCli({ kind: 'unavailable', reason: 'not installed' })
    const command = new ValidateWorkflow(
      createRiviereProjectRepository(undefined, undefined, undefined, aiCli),
    )

    const result = await command.execute({ workflowPath: workflowPath(directory) })

    expect(result.result.value).toMatchObject({
      success: false,
      errorCode: 'AI_CLI_UNAVAILABLE',
    })
  })
})

describe('RunWorkflow ai-cli pre-check command', () => {
  it('checks the AI command immediately before running the AI stage', async () => {
    const directory = createWorkflowWorkspace()
    writeAiExtractStage(directory)
    const { aiCli, commands } = recordingAiCli({ kind: 'unavailable', reason: 'missing' })
    const command = new RunWorkflow(
      createRiviereProjectRepository(undefined, undefined, undefined, aiCli),
    )

    const result = await command.execute({ workflowPath: workflowPath(directory) })

    expect(result.result).toMatchObject({ success: false, errorCode: 'AI_CLI_UNAVAILABLE' })
    expect(commands).toStrictEqual(['ai-cli'])
  })

  it('does not check AI commands when skip AI mode is selected', async () => {
    const directory = createWorkflowWorkspace()
    writeAiExtractStage(directory)
    const { aiCli, commands } = recordingAiCli({ kind: 'available' })
    const command = new RunWorkflow(
      createRiviereProjectRepository(undefined, undefined, undefined, aiCli),
    )

    const result = await command.execute({
      workflowPath: workflowPath(directory),
      mode: WorkflowRunMode.from('skip-ai'),
    })

    expect(result.result.success).toBe(true)
    expect(commands).toStrictEqual([])
  })

  it('does not check AI commands when dry run mode is selected', async () => {
    const directory = createWorkflowWorkspace()
    writeAiExtractStage(directory)
    const { aiCli, commands } = recordingAiCli({ kind: 'available' })
    const command = new RunWorkflow(
      createRiviereProjectRepository(undefined, undefined, undefined, aiCli),
    )

    const result = await command.execute({
      workflowPath: workflowPath(directory),
      mode: WorkflowRunMode.from('dry-run'),
    })

    expect(result.result.success).toBe(true)
    expect(commands).toStrictEqual([])
  })
})
