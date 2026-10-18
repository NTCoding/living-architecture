import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createRiviereProjectRepository } from '../../../__fixtures__/riviere-project-repository-fixtures'

const mocks = vi.hoisted(() => ({
  availabilityMock: vi.fn(),
  loadMock: vi.fn(),
  rebuildGraph: vi.fn(),
}))

vi.mock('../data-access/riviere-project/riviere-project-repository', () => ({
  RiviereProjectRepository: class {
    load = mocks.loadMock
  },
}))

import { RunWorkflow } from './run-workflow'
import { ExtractionConfigError } from '../data-access/riviere-project/riviere-config-error'
import { ExtractionDataAccessError } from '../data-access/riviere-project/riviere-project-error'

class UnexpectedWorkflowError extends Error {}

describe('RunWorkflow', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.loadMock.mockReturnValue({
      checkActiveAiCliAvailability: mocks.availabilityMock,
      rebuildGraph: mocks.rebuildGraph,
    })
    mocks.availabilityMock.mockReturnValue({ success: true })
    mocks.rebuildGraph.mockReturnValue({ success: true, graph: { metadata: {} } })
  })

  it('loads the workflow file and delegates the complete run to the project', async () => {
    const input = { workflowPath: '/project/.riviere/workflows/combined.yaml' }
    const result = await new RunWorkflow(createRiviereProjectRepository()).execute(input)

    expect(mocks.loadMock).toHaveBeenCalledWith({
      kind: 'workflow',
      workflowPath: '/project/.riviere/workflows/combined.yaml',
    })
    expect(mocks.rebuildGraph).toHaveBeenCalledWith(undefined)
    expect(result).toStrictEqual({ result: { success: true, graph: { metadata: {} } } })
  })

  it('checks active AI availability only for the selected run mode', async () => {
    await new RunWorkflow(createRiviereProjectRepository()).execute({
      workflowPath: '/project/.riviere/workflows/combined.yaml',
      mode: 'skip-ai',
    })

    expect(mocks.availabilityMock).toHaveBeenCalledWith(
      expect.objectContaining({ value: 'skip-ai' }),
    )
    expect(mocks.rebuildGraph).toHaveBeenCalledWith(expect.objectContaining({ value: 'skip-ai' }))
  })

  it('returns a typed failure and does not rebuild when an active AI command is unavailable', async () => {
    mocks.availabilityMock.mockReturnValue({
      success: false,
      command: 'claude',
      reason: 'spawn claude ENOENT',
    })

    const result = await new RunWorkflow(createRiviereProjectRepository()).execute({
      workflowPath: '/project/.riviere/workflows/combined.yaml',
    })

    expect(result).toStrictEqual({
      result: {
        success: false,
        errorCode: 'AI_CLI_UNAVAILABLE',
        reason: "AI CLI 'claude' is unavailable: spawn claude ENOENT",
        events: [],
        warnings: [],
      },
    })
    expect(mocks.rebuildGraph).not.toHaveBeenCalled()
  })

  it.each([
    new ExtractionConfigError('VALIDATION_ERROR', 'Invalid workflow'),
    new ExtractionDataAccessError('FILE_READ_ERROR', 'Cannot read workflow'),
  ])('returns typed loading failures', async (error) => {
    mocks.loadMock.mockImplementation(() => {
      throw error
    })

    await expect(
      new RunWorkflow(createRiviereProjectRepository()).execute({
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
      new RunWorkflow(createRiviereProjectRepository()).execute({
        workflowPath: '/project/.riviere/workflows/combined.yaml',
      }),
    ).rejects.toThrow('unexpected')
  })
})
