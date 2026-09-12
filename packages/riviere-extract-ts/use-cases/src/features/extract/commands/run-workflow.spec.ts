import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ loadMock: vi.fn(), rebuildGraph: vi.fn() }))

vi.mock('../data-access/riviere-project/riviere-project-repository', () => ({
  RiviereProjectRepository: class {
    load = mocks.loadMock
  },
}))

import { RunWorkflow } from './run-workflow'
import { RiviereProjectRepository } from '../data-access/riviere-project/riviere-project-repository'
import { ExtractionConfigError } from '../data-access/riviere-project/riviere-config-error'
import { ExtractionDataAccessError } from '../data-access/riviere-project/riviere-project-error'

class UnexpectedWorkflowError extends Error {}

describe('RunWorkflow', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.loadMock.mockReturnValue({ rebuildGraph: mocks.rebuildGraph })
    mocks.rebuildGraph.mockReturnValue({ success: true, graph: { metadata: {} } })
  })

  it('loads the workflow file and delegates the complete run to the project', async () => {
    const input = { workflowPath: '/project/.riviere/workflows/combined.yaml' }
    const result = await new RunWorkflow(new RiviereProjectRepository()).execute(input)

    expect(mocks.loadMock).toHaveBeenCalledWith({
      kind: 'workflow',
      workflowPath: '/project/.riviere/workflows/combined.yaml',
    })
    expect(mocks.rebuildGraph).toHaveBeenCalledWith()
    expect(result).toStrictEqual({ result: { success: true, graph: { metadata: {} } } })
  })

  it.each([
    new ExtractionConfigError('VALIDATION_ERROR', 'Invalid workflow'),
    new ExtractionDataAccessError('FILE_READ_ERROR', 'Cannot read workflow'),
  ])('returns typed loading failures', async (error) => {
    mocks.loadMock.mockImplementation(() => {
      throw error
    })

    await expect(
      new RunWorkflow(new RiviereProjectRepository()).execute({
        workflowPath: '/project/.riviere/workflows/combined.yaml',
      }),
    ).resolves.toStrictEqual({
      result: {
        success: false,
        errorCode: error.code,
        reason: error.message,
        events: [],
        warnings: [],
      },
    })
    expect(mocks.rebuildGraph).not.toHaveBeenCalled()
  })

  it('does not hide unexpected failures', async () => {
    mocks.loadMock.mockImplementation(() => {
      throw new UnexpectedWorkflowError('unexpected')
    })

    await expect(
      new RunWorkflow(new RiviereProjectRepository()).execute({
        workflowPath: '/project/.riviere/workflows/combined.yaml',
      }),
    ).rejects.toThrow('unexpected')
  })
})
