import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createRiviereProjectRepository } from '../../../__fixtures__/riviere-project-repository-fixtures'

const mocks = vi.hoisted(() => ({ availabilityMock: vi.fn(), loadMock: vi.fn() }))

vi.mock('../data-access/riviere-project/riviere-project-repository', () => ({
  RiviereProjectRepository: class {
    load = mocks.loadMock
  },
}))

import { ExtractionConfigError } from '../data-access/riviere-project/riviere-config-error'
import { ExtractionDataAccessError } from '../data-access/riviere-project/riviere-project-error'
import { ValidateWorkflow } from './validate-workflow'

class UnexpectedWorkflowError extends Error {}

describe('ValidateWorkflow', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.loadMock.mockReturnValue({
      checkConfiguredAiCliAvailability: mocks.availabilityMock,
    })
    mocks.availabilityMock.mockReturnValue({ success: true })
  })

  it('loads the workflow and reports it valid when every configured AI command is available', () => {
    const result = new ValidateWorkflow(createRiviereProjectRepository()).execute({
      workflowPath: '/project/.riviere/workflows/combined.yaml',
    })

    expect(mocks.loadMock).toHaveBeenCalledWith({
      kind: 'workflow',
      workflowPath: '/project/.riviere/workflows/combined.yaml',
    })
    expect(result).toStrictEqual({ result: { success: true } })
  })

  it('reports the unavailable configured AI command without running the workflow', () => {
    mocks.availabilityMock.mockReturnValue({
      success: false,
      command: 'claude',
      reason: 'spawn claude ENOENT',
    })

    const result = new ValidateWorkflow(createRiviereProjectRepository()).execute({
      workflowPath: '/project/.riviere/workflows/combined.yaml',
    })

    expect(result).toStrictEqual({
      result: {
        success: false,
        errorCode: 'AI_CLI_UNAVAILABLE',
        reason: "AI CLI 'claude' is unavailable: spawn claude ENOENT",
      },
    })
  })

  it.each([
    new ExtractionConfigError('VALIDATION_ERROR', 'Invalid workflow'),
    new ExtractionDataAccessError('FILE_READ_ERROR', 'Cannot read workflow'),
  ])('returns typed loading failures', (error) => {
    mocks.loadMock.mockImplementation(() => {
      throw error
    })

    const result = new ValidateWorkflow(createRiviereProjectRepository()).execute({
      workflowPath: '/project/.riviere/workflows/combined.yaml',
    })

    expect(result).toStrictEqual({
      result: { success: false, errorCode: error.code, reason: error.message },
    })
  })

  it('does not hide unexpected failures', () => {
    mocks.loadMock.mockImplementation(() => {
      throw new UnexpectedWorkflowError('unexpected')
    })

    expect(() =>
      new ValidateWorkflow(createRiviereProjectRepository()).execute({
        workflowPath: '/project/.riviere/workflows/combined.yaml',
      }),
    ).toThrow('unexpected')
  })
})
