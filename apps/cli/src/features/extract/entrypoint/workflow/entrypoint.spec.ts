import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { RunWorkflowResult } from '@living-architecture/riviere-extract-ts-use-cases/features/extract/commands/run-workflow-result'
import type { ValidateWorkflowResult } from '@living-architecture/riviere-extract-ts-use-cases/features/extract/commands/validate-workflow-result'
import { formatSuccess } from '../../../../infra/cli/presentation/output'
import { createWorkflowCommand, parseWorkflowRunMode } from './entrypoint'

const formattedOutput = formatSuccess('formatted')

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

function createDependencies(
  overrides: Partial<Parameters<typeof createWorkflowCommand>[0]> = {},
): Parameters<typeof createWorkflowCommand>[0] {
  return {
    formatRunWorkflowResult: vi.fn(() => formattedOutput),
    formatValidateWorkflowResult: vi.fn(() => formattedOutput),
    runWorkflow: { execute: vi.fn() },
    validateWorkflow: { execute: vi.fn() },
    writeCliOutput: vi.fn(),
    ...overrides,
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
  afterEach(() => vi.restoreAllMocks())

  it('formats and writes the validation result through injected dependencies', async () => {
    const validationResult: ValidateWorkflowResult = { result: { success: true } }
    const dependencies = createDependencies({
      validateWorkflow: { execute: () => validationResult },
    })
    const command = createWorkflowCommand(dependencies)

    await command.parseAsync(['node', 'test', 'validate', 'workflow.yaml'])

    expect(dependencies.formatValidateWorkflowResult).toHaveBeenCalledWith(validationResult)
    expect(dependencies.writeCliOutput).toHaveBeenCalledWith(formattedOutput)
  })

  it('formats and writes the run result through injected dependencies', async () => {
    const runResult = successRunResult()
    const execute = vi.fn(() => Promise.resolve(runResult))
    const dependencies = createDependencies({
      runWorkflow: { execute },
    })
    const command = createWorkflowCommand(dependencies)

    await command.parseAsync(['node', 'test', 'run', 'workflow.yaml', '--skip-ai'])

    expect(execute).toHaveBeenCalledWith({
      workflowPath: 'workflow.yaml',
      mode: 'skip-ai',
    })
    expect(dependencies.formatRunWorkflowResult).toHaveBeenCalledWith(runResult)
    expect(dependencies.writeCliOutput).toHaveBeenCalledWith(formattedOutput)
  })

  it('rejects contradictory skip AI and dry run flags without invoking the command', async () => {
    const execute = vi.fn()
    const dependencies = createDependencies({ runWorkflow: { execute } })
    const command = createWorkflowCommand(dependencies)
    command.commands.forEach((subcommand) => subcommand.exitOverride())

    await expect(
      command.parseAsync(['node', 'test', 'run', 'workflow.yaml', '--skip-ai', '--dry-run']),
    ).rejects.toThrow(/--skip-ai.*--dry-run/)

    expect(execute).not.toHaveBeenCalled()
  })

  it('contains no console or process exit calls', () => {
    const source = readFileSync(fileURLToPath(new URL('./entrypoint.ts', import.meta.url)), 'utf8')

    expect(source).not.toContain('console.')
    expect(source).not.toContain('process.exit')
  })
})
