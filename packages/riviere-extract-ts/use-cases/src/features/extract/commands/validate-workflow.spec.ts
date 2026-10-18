import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createRiviereProjectRepository } from '../../../__fixtures__/riviere-project-repository-fixtures'
import {
  UnexpectedWorkflowError,
  WORKFLOW_COMMAND_PATH,
  workflowCommandMocks,
  workflowLoadFailures,
} from '../../../__fixtures__/workflow-command-test-fixtures'

vi.mock('../data-access/riviere-project/riviere-project-repository', async () => {
  const { workflowRepositoryModuleMock } =
    await import('../../../__fixtures__/workflow-command-test-fixtures')
  return workflowRepositoryModuleMock()
})

import { ValidateWorkflow } from './validate-workflow'

describe('ValidateWorkflow', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    workflowCommandMocks.loadMock.mockReturnValue({
      checkConfiguredAiCliAvailability: workflowCommandMocks.availabilityMock,
    })
    workflowCommandMocks.availabilityMock.mockReturnValue({ success: true })
  })

  it('loads the workflow and reports it valid when every configured AI command is available', () => {
    const result = new ValidateWorkflow(createRiviereProjectRepository()).execute({
      workflowPath: WORKFLOW_COMMAND_PATH,
    })

    expect(workflowCommandMocks.loadMock).toHaveBeenCalledWith({
      kind: 'workflow',
      workflowPath: WORKFLOW_COMMAND_PATH,
    })
    expect(result).toStrictEqual({ result: { success: true } })
  })

  it('reports the unavailable configured AI command without running the workflow', () => {
    workflowCommandMocks.availabilityMock.mockReturnValue({
      success: false,
      command: 'claude',
      reason: 'spawn claude ENOENT',
    })

    const result = new ValidateWorkflow(createRiviereProjectRepository()).execute({
      workflowPath: WORKFLOW_COMMAND_PATH,
    })

    expect(result).toStrictEqual({
      result: {
        success: false,
        errorCode: 'AI_CLI_UNAVAILABLE',
        reason: "AI CLI 'claude' is unavailable: spawn claude ENOENT",
      },
    })
  })

  it.each(workflowLoadFailures())('returns typed loading failures', ({ error, code }) => {
    workflowCommandMocks.loadMock.mockImplementation(() => {
      throw error
    })

    const result = new ValidateWorkflow(createRiviereProjectRepository()).execute({
      workflowPath: WORKFLOW_COMMAND_PATH,
    })

    expect(result).toStrictEqual({
      result: { success: false, errorCode: code, reason: error.message },
    })
  })

  it('does not hide unexpected failures', () => {
    workflowCommandMocks.loadMock.mockImplementation(() => {
      throw new UnexpectedWorkflowError('unexpected')
    })

    expect(() =>
      new ValidateWorkflow(createRiviereProjectRepository()).execute({
        workflowPath: WORKFLOW_COMMAND_PATH,
      }),
    ).toThrow('unexpected')
  })
})
