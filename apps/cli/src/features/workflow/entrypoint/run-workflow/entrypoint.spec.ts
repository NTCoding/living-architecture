import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RunWorkflow } from '@living-architecture/riviere-extract-ts-use-cases/features/extract/commands/run-workflow'
import { createRunWorkflowCommand } from './entrypoint'

const initialExitCode = process.exitCode

function run(workflow: Pick<RunWorkflow, 'execute'>): Promise<void> {
  return createRunWorkflowCommand({ runWorkflow: workflow }).parseAsync(['main'], { from: 'user' })
}

describe('riviere workflow run', () => {
  beforeEach(() => {
    process.exitCode = undefined
  })

  afterEach(() => {
    process.exitCode = initialExitCode
    vi.restoreAllMocks()
  })

  it('runs the named workflow and writes its success result', async () => {
    const execute = vi.fn(() => ({
      result: {
        kind: 'success' as const,
        graph: { version: '1.0', metadata: { domains: {}, sources: [] }, components: [], links: [], externalLinks: [] },
        outputPath: '/work/graph.json',
        runLogDirectory: '/work/logs',
      },
    }))
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)

    await run({ execute })

    expect(execute).toHaveBeenCalledWith({ projectRoot: process.cwd(), workflowName: 'main' })
    expect(log).toHaveBeenCalledWith(expect.stringContaining('"outputPath":"/work/graph.json"'))
  })

  it('writes a typed failure and exits non-zero', async () => {
    const execute = vi.fn(() => ({
      result: { kind: 'configFailure' as const, code: 'CONFIG_NOT_FOUND' as const, message: 'Not found' },
    }))
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    await run({ execute })

    expect(error).toHaveBeenCalledWith(
      JSON.stringify({ kind: 'configFailure', code: 'CONFIG_NOT_FOUND', message: 'Not found' }),
    )
    expect(process.exitCode).toBe(1)
  })
})
