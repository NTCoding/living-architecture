import type { Mock } from 'vitest'
import { ExtractionConfigError } from '../features/extract/data-access/riviere-project/riviere-config-error'
import { ExtractionDataAccessError } from '../features/extract/data-access/riviere-project/riviere-project-error'

export const WORKFLOW_COMMAND_PATH = '/project/.riviere/workflows/combined.yaml'

export class UnexpectedWorkflowError extends Error {}

export async function workflowRepositoryModuleMock(): Promise<{
  RiviereProjectRepository: new () => { load: Mock }
}> {
  const { workflowCommandMocks } = await import('./workflow-command-mocks')
  return {
    RiviereProjectRepository: class {
      load = workflowCommandMocks.loadMock
    },
  }
}

export { workflowCommandMocks } from './workflow-command-mocks'

export function workflowLoadFailures(): readonly Readonly<{ error: Error; code: string }>[] {
  return [
    {
      error: new ExtractionConfigError('VALIDATION_ERROR', 'Invalid workflow'),
      code: 'VALIDATION_ERROR',
    },
    {
      error: new ExtractionDataAccessError('FILE_READ_ERROR', 'Cannot read workflow'),
      code: 'FILE_READ_ERROR',
    },
  ]
}
