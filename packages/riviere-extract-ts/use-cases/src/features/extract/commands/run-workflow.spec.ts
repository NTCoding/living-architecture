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

import { RunWorkflow } from './run-workflow'

describe('RunWorkflow', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    workflowCommandMocks.loadMock.mockReturnValue({
      checkActiveAiCliAvailability: workflowCommandMocks.availabilityMock,
      rebuildGraph: workflowCommandMocks.rebuildGraph,
    })
    workflowCommandMocks.availabilityMock.mockReturnValue({ success: true })
    workflowCommandMocks.rebuildGraph.mockReturnValue({ success: true, graph: { metadata: {} } })
  })

  it('loads the workflow file and delegates the complete run to the project', async () => {
    const result = await new RunWorkflow(createRiviereProjectRepository()).execute({
      workflowPath: WORKFLOW_COMMAND_PATH,
      mode: 'run',
    })

    expect(workflowCommandMocks.loadMock).toHaveBeenCalledWith({
      kind: 'workflow',
      workflowPath: WORKFLOW_COMMAND_PATH,
    })
    expect(workflowCommandMocks.rebuildGraph).toHaveBeenCalledWith(
      expect.objectContaining({ value: 'run' }),
    )
    expect(result).toStrictEqual({ result: { success: true, graph: { metadata: {} } } })
  })

  it('checks active AI availability for the selected run mode', async () => {
    await new RunWorkflow(createRiviereProjectRepository()).execute({
      workflowPath: WORKFLOW_COMMAND_PATH,
      mode: 'skip-ai',
    })

    expect(workflowCommandMocks.availabilityMock).toHaveBeenCalledWith(
      expect.objectContaining({ value: 'skip-ai' }),
    )
    expect(workflowCommandMocks.rebuildGraph).toHaveBeenCalledWith(
      expect.objectContaining({ value: 'skip-ai' }),
    )
  })

  it('checks active AI availability for a dry run', async () => {
    await new RunWorkflow(createRiviereProjectRepository()).execute({
      workflowPath: WORKFLOW_COMMAND_PATH,
      mode: 'dry-run',
    })

    expect(workflowCommandMocks.availabilityMock).toHaveBeenCalledWith(
      expect.objectContaining({ value: 'dry-run' }),
    )
    expect(workflowCommandMocks.rebuildGraph).toHaveBeenCalledWith(
      expect.objectContaining({ value: 'dry-run' }),
    )
  })

  it('returns a validation error for an unsupported run mode without checking availability or rebuilding', async () => {
    const result = await new RunWorkflow(createRiviereProjectRepository()).execute({
      workflowPath: WORKFLOW_COMMAND_PATH,
      mode: 'unsupported-mode',
    })

    expect(result).toStrictEqual({
      result: {
        success: false,
        errorCode: 'VALIDATION_ERROR',
        reason:
          "Expected a workflow run mode of 'run', 'skip-ai', or 'dry-run', got 'unsupported-mode'.",
        events: [],
        warnings: [],
      },
    })
    expect(workflowCommandMocks.availabilityMock).not.toHaveBeenCalled()
    expect(workflowCommandMocks.rebuildGraph).not.toHaveBeenCalled()
  })

  it('returns a typed failure and does not rebuild when an active AI command is unavailable', async () => {
    workflowCommandMocks.availabilityMock.mockReturnValue({
      success: false,
      command: 'claude',
      reason: 'spawn claude ENOENT',
    })

    const result = await new RunWorkflow(createRiviereProjectRepository()).execute({
      workflowPath: WORKFLOW_COMMAND_PATH,
      mode: 'run',
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
    expect(workflowCommandMocks.rebuildGraph).not.toHaveBeenCalled()
  })

  it.each(workflowLoadFailures())('returns typed loading failures', async ({ error, code }) => {
    workflowCommandMocks.loadMock.mockImplementation(() => {
      throw error
    })

    await expect(
      new RunWorkflow(createRiviereProjectRepository()).execute({
        workflowPath: WORKFLOW_COMMAND_PATH,
        mode: 'run',
      }),
    ).resolves.toMatchObject({
      result: { success: false, errorCode: code },
    })
    expect(workflowCommandMocks.rebuildGraph).not.toHaveBeenCalled()
  })

  it('does not hide unexpected failures', async () => {
    workflowCommandMocks.loadMock.mockImplementation(() => {
      throw new UnexpectedWorkflowError('unexpected')
    })

    await expect(
      new RunWorkflow(createRiviereProjectRepository()).execute({
        workflowPath: WORKFLOW_COMMAND_PATH,
        mode: 'run',
      }),
    ).rejects.toThrow('unexpected')
  })
})
