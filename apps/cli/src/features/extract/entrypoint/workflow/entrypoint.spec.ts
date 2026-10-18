import { afterEach, describe, expect, it, vi } from 'vitest'
import type { RunWorkflowResult } from '@living-architecture/riviere-extract-ts-use-cases/features/extract/commands/run-workflow-result'
import type { ValidateWorkflowResult } from '@living-architecture/riviere-extract-ts-use-cases/features/extract/commands/validate-workflow-result'
import { createWorkflowCommand, parseWorkflowRunMode } from './entrypoint'

function successRunResult(): RunWorkflowResult {
  return {
    result: {
      success: true,
      graph: { version: '1.0', metadata: { domains: {} }, components: [], links: [] },
      outputPath: '/project/.riviere/graph.json',
      runLogDirectory: '/project/.riviere',
      events: [],
      warnings: [],
    },
  }
}

describe('parseWorkflowRunMode', () => {
  it('returns skip-ai when skip AI is selected', () => {
    expect(parseWorkflowRunMode({ skipAi: true })).toBe('skip-ai')
  })

  it('returns dry-run when dry run is selected', () => {
    expect(parseWorkflowRunMode({ dryRun: true })).toBe('dry-run')
  })

  it('returns run when neither flag is selected', () => {
    expect(parseWorkflowRunMode({})).toBe('run')
  })
})

describe('workflow command entrypoint', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    process.exitCode = undefined
  })

  it('prints a valid message when workflow validation succeeds', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const validateWorkflow = vi.fn<(input: { workflowPath: string }) => ValidateWorkflowResult>(
      () => ({ result: { success: true } }),
    )
    const command = createWorkflowCommand({
      runWorkflow: { execute: vi.fn() },
      validateWorkflow: { execute: validateWorkflow },
    })

    await command.parseAsync(['node', 'test', 'validate', 'workflow.yaml'])

    expect(validateWorkflow).toHaveBeenCalledWith({ workflowPath: 'workflow.yaml' })
    expect(log).toHaveBeenCalledWith('Workflow is valid')
  })

  it('prints the workflow validation failure and marks the process failed', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const command = createWorkflowCommand({
      runWorkflow: { execute: vi.fn() },
      validateWorkflow: {
        execute: () => ({
          result: {
            success: false,
            errorCode: 'AI_CLI_UNAVAILABLE',
            reason: "AI CLI 'claude' is unavailable: spawn claude ENOENT",
          },
        }),
      },
    })

    await command.parseAsync(['node', 'test', 'validate', 'workflow.yaml'])

    expect(error).toHaveBeenCalledWith(
      "AI_CLI_UNAVAILABLE: AI CLI 'claude' is unavailable: spawn claude ENOENT",
    )
    expect(process.exitCode).toBe(1)
  })

  it('prints the completed output path when a run succeeds', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const runWorkflow = vi.fn(() => Promise.resolve(successRunResult()))
    const command = createWorkflowCommand({
      runWorkflow: { execute: runWorkflow },
      validateWorkflow: { execute: vi.fn() },
    })

    await command.parseAsync(['node', 'test', 'run', 'workflow.yaml', '--skip-ai'])

    expect(runWorkflow).toHaveBeenCalledWith({ workflowPath: 'workflow.yaml', mode: 'skip-ai' })
    expect(log).toHaveBeenCalledWith('Workflow completed: /project/.riviere/graph.json')
  })

  it('prints the workflow run failure and marks the process failed', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const command = createWorkflowCommand({
      runWorkflow: {
        execute: () =>
          Promise.resolve({
            result: {
              success: false,
              errorCode: 'AI_CLI_UNAVAILABLE',
              reason: 'AI CLI unavailable',
              events: [],
              warnings: [],
            },
          }),
      },
      validateWorkflow: { execute: vi.fn() },
    })

    await command.parseAsync(['node', 'test', 'run', 'workflow.yaml', '--dry-run'])

    expect(error).toHaveBeenCalledWith('AI_CLI_UNAVAILABLE: AI CLI unavailable')
    expect(process.exitCode).toBe(1)
  })
})
