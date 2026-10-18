import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, assert, describe, expect, it, vi } from 'vitest'
import type {
  AiCli,
  AiCliAvailability,
} from '@living-architecture/riviere-extract-ts-domain-model/domain/ports/ai-cli'
import { WorkflowRunMode } from '@living-architecture/riviere-extract-ts-domain-model/domain/workflow'
import {
  cleanupWorkflowWorkspaces,
  createWorkflowWorkspace,
} from '../../../../__fixtures__/riviere-project-workspace-fixtures'
import { createRiviereProjectRepository } from '../../../../__fixtures__/riviere-project-repository-fixtures'
import { RiviereProjectRepository } from './riviere-project-repository'

const AI_EXTRACT_CONFIG = [
  'command: claude',
  'args:',
  '  - -p',
  'timeout-seconds: 30',
  'sources:',
  '  - ./component.ts',
  'selection:',
  '  from:',
  '    - missing-events',
  '  component-types:',
  '    - Event',
  'outputs:',
  '  add-components: true',
  '  add-links: true',
  'context:',
  '  exclude: []',
  '  max-files-per-batch: 10',
  '  max-batches: 2',
].join('\n')

function writeAiWorkflow(directory: string): string {
  const workflowPath = join(directory, '.riviere', 'workflows', 'combined.yaml')
  writeFileSync(
    workflowPath,
    [
      'apiVersion: v1',
      'name: combined-graph',
      'output: ../graph.json',
      'sources:',
      '  - repository: workflow-test',
      'domains:',
      '  orders:',
      '    description: orders domain',
      'stages:',
      '  - kind: ai-extract',
      '    name: discover',
      '    config: ai.yaml',
    ].join('\n'),
  )
  writeFileSync(join(directory, '.riviere', 'workflows', 'ai.yaml'), AI_EXTRACT_CONFIG)
  return workflowPath
}

function aiCli(
  checkAvailability: AiCli['checkAvailability'] = (command) =>
    Promise.resolve({ kind: 'available', command }),
): AiCli {
  return {
    checkAvailability,
    run: () => Promise.resolve({ kind: 'invalid-arguments', reason: 'Execution is not expected' }),
  }
}

function repositoryWith(aiCliCollaborator: AiCli): RiviereProjectRepository {
  return createRiviereProjectRepository(undefined, undefined, undefined, aiCliCollaborator)
}

afterEach(cleanupWorkflowWorkspaces)

describe('RiviereProjectRepository AI CLI collaborator supply', () => {
  it('supplies the injected AI CLI to an active AI-extract stage', async () => {
    const directory = createWorkflowWorkspace()
    const workflowPath = writeAiWorkflow(directory)
    const checkAvailability = vi.fn(
      (command: string): Promise<AiCliAvailability> =>
        Promise.resolve({ kind: 'available', command }),
    )
    const repository = repositoryWith(aiCli(checkAvailability))

    const project = repository.load({ kind: 'workflow', workflowPath })
    const result = await project.rebuildGraph(WorkflowRunMode.from('run'))

    expect(checkAvailability).toHaveBeenCalledWith('claude')
    expect(result).toMatchObject({
      success: false,
      errorCode: 'STAGE_BEHAVIOUR_UNAVAILABLE',
    })
  })

  it('returns a typed failure when the active AI command is unavailable', async () => {
    const directory = createWorkflowWorkspace()
    const workflowPath = writeAiWorkflow(directory)
    const repository = repositoryWith(
      aiCli(() =>
        Promise.resolve({ kind: 'unavailable', command: 'claude', reason: 'spawn claude ENOENT' }),
      ),
    )

    const project = repository.load({ kind: 'workflow', workflowPath })
    const result = await project.rebuildGraph(WorkflowRunMode.from('run'))

    expect(result).toMatchObject({
      success: false,
      errorCode: 'AI_CLI_UNAVAILABLE',
      reason: 'spawn claude ENOENT',
    })
  })

  it('does not check the AI command during a dry run', async () => {
    const directory = createWorkflowWorkspace()
    const workflowPath = writeAiWorkflow(directory)
    const checkAvailability = vi.fn(
      (command: string): Promise<AiCliAvailability> =>
        Promise.resolve({ kind: 'available', command }),
    )
    const repository = repositoryWith(aiCli(checkAvailability))

    const project = repository.load({ kind: 'workflow', workflowPath })
    const result = await project.rebuildGraph(WorkflowRunMode.from('dry-run'))

    expect(checkAvailability).not.toHaveBeenCalled()
    assert(!result.success)
    expect(result.errorCode).toBe('STAGE_BEHAVIOUR_UNAVAILABLE')
  })

  it('does not check the AI command when skip-ai removes the stage', async () => {
    const directory = createWorkflowWorkspace()
    const workflowPath = writeAiWorkflow(directory)
    const checkAvailability = vi.fn(
      (command: string): Promise<AiCliAvailability> =>
        Promise.resolve({ kind: 'available', command }),
    )
    const repository = repositoryWith(aiCli(checkAvailability))

    const project = repository.load({ kind: 'workflow', workflowPath })
    const result = await project.rebuildGraph(WorkflowRunMode.from('skip-ai'))

    expect(checkAvailability).not.toHaveBeenCalled()
    assert(result.success)
  })
})
