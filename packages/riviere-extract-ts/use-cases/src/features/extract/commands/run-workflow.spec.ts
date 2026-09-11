import { resolve } from 'node:path'
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

  it('loads the named workflow and delegates the complete run to the project', () => {
    const input = { projectRoot: '/project', workflowName: 'combined' }
    const result = new RunWorkflow(new RiviereProjectRepository()).execute(input)

    expect(mocks.loadMock).toHaveBeenCalledWith({
      kind: 'workflow',
      workflowPath: resolve('/project', '.riviere', 'workflows', 'combined.yaml'),
    })
    expect(mocks.rebuildGraph).toHaveBeenCalledWith()
    expect(result).toStrictEqual({ result: { success: true, graph: { metadata: {} } } })
  })

  it.each([
    new ExtractionConfigError('VALIDATION_ERROR', 'Invalid workflow'),
    new ExtractionDataAccessError('FILE_READ_ERROR', 'Cannot read workflow'),
  ])('returns typed loading failures', (error) => {
    mocks.loadMock.mockImplementation(() => {
      throw error
    })

    expect(
      new RunWorkflow(new RiviereProjectRepository()).execute({
        projectRoot: '/project',
        workflowName: 'combined',
      }),
    ).toStrictEqual({
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

  it('does not hide unexpected failures', () => {
    mocks.loadMock.mockImplementation(() => {
      throw new UnexpectedWorkflowError('unexpected')
    })

    expect(() =>
      new RunWorkflow(new RiviereProjectRepository()).execute({
        projectRoot: '/project',
        workflowName: 'combined',
      }),
    ).toThrow('unexpected')
  })
})
