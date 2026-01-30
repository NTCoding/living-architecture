import {
  describe, it, expect, vi, beforeEach 
} from 'vitest'
import { z } from 'zod'

const { mockHandleError } = vi.hoisted(() => ({ mockHandleError: vi.fn() }))
const { mockWriteFileSync } = vi.hoisted(() => ({ mockWriteFileSync: vi.fn() }))

vi.mock('./error-handler', () => ({ handleWorkflowError: mockHandleError }))
vi.mock('node:fs', () => ({ writeFileSync: mockWriteFileSync }))

import {
  runWorkflow, formatTimingsMarkdown 
} from './run-workflow'
import {
  success, failure 
} from './step-result'
import type {
  BaseContext, Step 
} from './workflow-runner'

class TestExitSignal extends Error {
  constructor() {
    super('process.exit called')
    this.name = 'TestExitSignal'
  }
}

class ContextBuildError extends Error {
  constructor() {
    super('context error')
    this.name = 'ContextBuildError'
  }
}

const outputSchema = z.object({
  success: z.boolean().optional(),
  data: z.unknown().optional(),
  custom: z.string().optional(),
})

describe('runWorkflow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  it('runs workflow and exits with 0 on success', async () => {
    const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new TestExitSignal()
    })
    vi.spyOn(console, 'log').mockImplementation(vi.fn())

    const steps: Step<BaseContext>[] = [
      {
        name: 'step1',
        execute: async () => success('output'),
      },
    ]
    const buildContext = async () => ({ branch: 'test' })

    runWorkflow(steps, buildContext)

    await vi.waitFor(() => {
      expect(mockExit).toHaveBeenCalledWith(0)
    })
  })

  it('runs workflow and exits with 1 on failure', async () => {
    const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new TestExitSignal()
    })
    vi.spyOn(console, 'log').mockImplementation(vi.fn())

    const steps: Step<BaseContext>[] = [
      {
        name: 'step1',
        execute: async () => failure('error'),
      },
    ]
    const buildContext = async () => ({ branch: 'test' })

    runWorkflow(steps, buildContext)

    await vi.waitFor(() => {
      expect(mockExit).toHaveBeenCalledWith(1)
    })
  })

  it('logs JSON output', async () => {
    vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new TestExitSignal()
    })
    const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(vi.fn())

    const steps: Step<BaseContext>[] = [
      {
        name: 'step1',
        execute: async () => success({ data: 'test' }),
      },
    ]
    const buildContext = async () => ({ branch: 'test' })

    runWorkflow(steps, buildContext)

    await vi.waitFor(() => {
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('data'))
      const output = String(mockConsoleLog.mock.calls[0]?.[0])
      expect(JSON.parse(output)).toMatchObject({ data: 'test' })
    })
  })

  it('uses custom result formatter when provided', async () => {
    vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new TestExitSignal()
    })
    const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(vi.fn())

    const steps: Step<BaseContext>[] = [
      {
        name: 'step1',
        execute: async () => success(),
      },
    ]
    const buildContext = async () => ({ branch: 'test' })
    const formatResult = () => ({ custom: 'format' })

    runWorkflow(steps, buildContext, formatResult)

    await vi.waitFor(() => {
      const output = String(mockConsoleLog.mock.calls[0]?.[0])
      const parsed = outputSchema.parse(JSON.parse(output))
      expect(parsed).toMatchObject({ custom: 'format' })
    })
  })

  it('falls back to result when no output and no formatter', async () => {
    vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new TestExitSignal()
    })
    const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(vi.fn())

    const steps: Step<BaseContext>[] = [
      {
        name: 'step1',
        execute: async () => success(),
      },
    ]
    const buildContext = async () => ({ branch: 'test' })

    runWorkflow(steps, buildContext)

    await vi.waitFor(() => {
      const output = String(mockConsoleLog.mock.calls[0]?.[0])
      const parsed = outputSchema.parse(JSON.parse(output))
      expect(parsed.success).toStrictEqual(true)
    })
  })

  it('calls error handler when context builder throws', async () => {
    vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new TestExitSignal()
    })
    vi.spyOn(console, 'log').mockImplementation(vi.fn())

    const steps: Step<BaseContext>[] = []
    const buildContext = async () => {
      throw new ContextBuildError()
    }

    runWorkflow(steps, buildContext)

    await vi.waitFor(() => {
      expect(mockHandleError).toHaveBeenCalledWith(expect.any(ContextBuildError))
    })
  })

  it('writes timing file when timingsFilePath provided', async () => {
    vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new TestExitSignal()
    })
    vi.spyOn(console, 'log').mockImplementation(vi.fn())

    const steps: Step<BaseContext>[] = [
      {
        name: 'step1',
        execute: async () => success(),
      },
    ]
    const buildContext = async () => ({ branch: 'test' })

    runWorkflow(steps, buildContext, undefined, {resolveTimingsFilePath: () => 'reviews/test-branch/timings.md',})

    await vi.waitFor(() => {
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        'reviews/test-branch/timings.md',
        expect.stringContaining('step1'),
        'utf-8',
      )
    })
  })

  it('does not write timing file when timingsFilePath omitted', async () => {
    vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new TestExitSignal()
    })
    vi.spyOn(console, 'log').mockImplementation(vi.fn())

    const steps: Step<BaseContext>[] = [
      {
        name: 'step1',
        execute: async () => success(),
      },
    ]
    const buildContext = async () => ({ branch: 'test' })

    runWorkflow(steps, buildContext)

    await vi.waitFor(() => {
      expect(mockWriteFileSync).not.toHaveBeenCalled()
    })
  })
})

describe('formatTimingsMarkdown', () => {
  it('formats step timings as markdown table', () => {
    const result = formatTimingsMarkdown(
      [
        {
          name: 'verify-build',
          durationMs: 45200,
        },
        {
          name: 'code-review',
          durationMs: 38700,
        },
      ],
      83900,
    )

    expect(result).toContain('| verify-build | 45.2s |')
    expect(result).toContain('| code-review | 38.7s |')
    expect(result).toContain('**Total: 83.9s**')
  })

  it('formats sub-second durations in milliseconds', () => {
    const result = formatTimingsMarkdown(
      [
        {
          name: 'fast-step',
          durationMs: 42,
        },
      ],
      42,
    )

    expect(result).toContain('| fast-step | 42ms |')
    expect(result).toContain('**Total: 42ms**')
  })
})
