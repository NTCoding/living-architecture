import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, assert, describe, expect, it, vi } from 'vitest'
import type {
  AiCli,
  AiCliAvailability,
} from '@living-architecture/riviere-extract-ts-domain-model/domain/ports/ai-cli'
import type { LoadAiExtractSources } from '@living-architecture/riviere-extract-ts-domain-model/domain/ports/load-ai-extract-sources'
import type { ReadAiExtractSourceFiles } from '@living-architecture/riviere-extract-ts-domain-model/domain/ports/read-ai-extract-source-files'
import { WorkflowRunMode } from '@living-architecture/riviere-extract-ts-domain-model/domain/workflow'
import {
  cleanupWorkflowWorkspaces,
  createWorkflowWorkspace,
} from '../../../../__fixtures__/riviere-project-workspace-fixtures'
import {
  aiCli,
  createRiviereProjectRepository,
} from '../../../../__fixtures__/riviere-project-repository-fixtures'
import { writeWorkflow } from '../../../../__fixtures__/riviere-project-workflow-fixtures'
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

const componentSource: LoadAiExtractSources = () =>
  Promise.resolve({
    filePaths: ['component.ts'],
    missingPaths: [],
  })

const componentSourceFiles: ReadAiExtractSourceFiles = () =>
  Promise.resolve([{ filePath: 'component.ts', content: 'emit(OrderPlaced)' }])

function writeAiWorkflow(directory: string): string {
  writeWorkflow(directory, '  - kind: ai-extract\n    name: discover\n    config: ai.yaml')
  writeFileSync(join(directory, '.riviere', 'workflows', 'ai.yaml'), AI_EXTRACT_CONFIG)
  return join(directory, '.riviere', 'workflows', 'combined.yaml')
}

function repositoryWith(
  checkAvailability: AiCli['checkAvailability'],
  loadAiExtractSources?: LoadAiExtractSources,
  loadAiExtractSourceFiles?: ReadAiExtractSourceFiles,
): RiviereProjectRepository {
  return createRiviereProjectRepository(
    undefined,
    undefined,
    undefined,
    aiCli({ checkAvailability }),
    loadAiExtractSources,
    loadAiExtractSourceFiles,
  )
}

afterEach(cleanupWorkflowWorkspaces)

describe('RiviereProjectRepository AI CLI collaborator supply', () => {
  it('checks the active AI command when the workflow runs', async () => {
    const directory = createWorkflowWorkspace()
    const workflowPath = writeAiWorkflow(directory)
    const checkAvailability = vi.fn(
      (command: string): Promise<AiCliAvailability> =>
        Promise.resolve({ kind: 'available', command }),
    )
    const repository = repositoryWith(checkAvailability, componentSource, componentSourceFiles)

    const project = repository.load({ kind: 'workflow', workflowPath })
    const result = await project.rebuildGraph(WorkflowRunMode.from('run'))

    expect(checkAvailability).toHaveBeenCalledTimes(2)
    expect(checkAvailability).toHaveBeenCalledWith('claude')
    expect(result).toMatchObject({ success: false, errorCode: 'AI_CLI_FAILED' })
  })

  it('fails with a typed error when the active AI command is unavailable', async () => {
    const directory = createWorkflowWorkspace()
    const workflowPath = writeAiWorkflow(directory)
    const repository = repositoryWith(() =>
      Promise.resolve({ kind: 'unavailable', command: 'claude', reason: 'spawn claude ENOENT' }),
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
    const repository = repositoryWith(checkAvailability)

    const project = repository.load({ kind: 'workflow', workflowPath })
    const result = await project.rebuildGraph(WorkflowRunMode.from('dry-run'))

    expect(checkAvailability).not.toHaveBeenCalled()
    assert(result.success)
  })

  it('does not check the AI command when skip-ai removes the stage', async () => {
    const directory = createWorkflowWorkspace()
    const workflowPath = writeAiWorkflow(directory)
    const checkAvailability = vi.fn(
      (command: string): Promise<AiCliAvailability> =>
        Promise.resolve({ kind: 'available', command }),
    )
    const repository = repositoryWith(checkAvailability)

    const project = repository.load({ kind: 'workflow', workflowPath })
    const result = await project.rebuildGraph(WorkflowRunMode.from('skip-ai'))

    expect(checkAvailability).not.toHaveBeenCalled()
    assert(result.success)
  })
})
