import {
  describe, it, expect, vi, beforeEach 
} from 'vitest'
import { z } from 'zod'

const { mockHandleError } = vi.hoisted(() => ({ mockHandleError: vi.fn() }))

vi.mock('./error-handler', () => ({ handleWorkflowError: mockHandleError }))

import { runWorkflow } from './run-workflow'
import {
  success, failure 
} from '../../domain/workflow-execution/step-result'
import type {
  BaseContext, Step 
} from '../../domain/workflow-execution/workflow-runner'
import type { WorkflowIO } from '../../domain/workflow-io'

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

interface MockWorkflowIO extends WorkflowIO {
  logCalls: string[]
  writeFileCalls: Array<{
    path: string
    content: string
  }>
  exitCode: number | undefined
}

function createMockIO(): MockWorkflowIO {
  const state: {
    logCalls: string[]
    writeFileCalls: Array<{
      path: string
      content: string
    }>
    exitCode: number | undefined
  } = {
    logCalls: [],
    writeFileCalls: [],
    exitCode: undefined,
  }

  return {
    get logCalls() {
      return state.logCalls
    },
    get writeFileCalls() {
      return state.writeFileCalls
    },
    get exitCode() {
      return state.exitCode
    },
    writeFile(path: string, content: string): void {
      state.writeFileCalls.push({
        path,
        content,
      })
    },
    log(output: string): void {
      state.logCalls.push(output)
    },
    exit(code: number): void {
      state.exitCode = code
      throw new TestExitSignal()
    },
  }
}

describe('runWorkflow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  it('runs workflow and exits with 0 on success', async () => {
    const mockIO = createMockIO()
    const steps: Step<BaseContext>[] = [
      {
        name: 'step1',
        execute: async () => success('output'),
      },
    ]
    const buildContext = async () => ({ branch: 'test' })

    runWorkflow(steps, buildContext, undefined, { io: mockIO })

    await vi.waitFor(() => {
      expect(mockIO.exitCode).toBe(0)
    })
  })

  it('exits with 0 even on workflow failure (result communicated via JSON)', async () => {
    const mockIO = createMockIO()
    const steps: Step<BaseContext>[] = [
      {
        name: 'step1',
        execute: async () => failure('error'),
      },
    ]
    const buildContext = async () => ({ branch: 'test' })

    runWorkflow(steps, buildContext, undefined, { io: mockIO })

    await vi.waitFor(() => {
      expect(mockIO.exitCode).toBe(0)
    })
  })

  it('logs JSON output', async () => {
    const mockIO = createMockIO()
    const steps: Step<BaseContext>[] = [
      {
        name: 'step1',
        execute: async () => success({ data: 'test' }),
      },
    ]
    const buildContext = async () => ({ branch: 'test' })

    runWorkflow(steps, buildContext, undefined, { io: mockIO })

    await vi.waitFor(() => {
      expect(mockIO.logCalls.length).toBeGreaterThan(0)
      const output = mockIO.logCalls[0]
      expect(output).toBeTruthy()
      expect(output).toContain('data')
      expect(JSON.parse(output)).toMatchObject({ data: 'test' })
    })
  })

  it('uses custom result formatter when provided', async () => {
    const mockIO = createMockIO()
    const steps: Step<BaseContext>[] = [
      {
        name: 'step1',
        execute: async () => success(),
      },
    ]
    const buildContext = async () => ({ branch: 'test' })
    const formatResult = () => ({ custom: 'format' })

    runWorkflow(steps, buildContext, formatResult, { io: mockIO })

    await vi.waitFor(() => {
      const output = mockIO.logCalls[0]
      expect(output).toBeTruthy()
      const parsed = outputSchema.parse(JSON.parse(output))
      expect(parsed).toMatchObject({ custom: 'format' })
    })
  })

  it('falls back to result when no output and no formatter', async () => {
    const mockIO = createMockIO()
    const steps: Step<BaseContext>[] = [
      {
        name: 'step1',
        execute: async () => success(),
      },
    ]
    const buildContext = async () => ({ branch: 'test' })

    runWorkflow(steps, buildContext, undefined, { io: mockIO })

    await vi.waitFor(() => {
      const output = mockIO.logCalls[0]
      expect(output).toBeTruthy()
      const parsed = outputSchema.parse(JSON.parse(output))
      expect(parsed.success).toStrictEqual(true)
    })
  })

  it('calls error handler when context builder throws', async () => {
    const mockIO = createMockIO()
    const steps: Step<BaseContext>[] = []
    const buildContext = async () => {
      throw new ContextBuildError()
    }

    runWorkflow(steps, buildContext, undefined, { io: mockIO })

    await vi.waitFor(() => {
      expect(mockHandleError).toHaveBeenCalledWith(expect.any(ContextBuildError), undefined)
    })
  })

  it('writes timing file when timingsFilePath provided', async () => {
    const mockIO = createMockIO()
    const steps: Step<BaseContext>[] = [
      {
        name: 'step1',
        execute: async () => success(),
      },
    ]
    const buildContext = async () => ({ branch: 'test' })

    runWorkflow(steps, buildContext, undefined, {
      resolveTimingsFilePath: () => 'reviews/test-branch/timings.md',
      io: mockIO,
    })

    await vi.waitFor(() => {
      expect(mockIO.writeFileCalls).toHaveLength(1)
      expect(mockIO.writeFileCalls[0]).toMatchObject({
        path: 'reviews/test-branch/timings.md',
        content: expect.stringContaining('step1'),
      })
    })
  })

  it('does not write timing file when timingsFilePath omitted', async () => {
    const mockIO = createMockIO()
    const steps: Step<BaseContext>[] = [
      {
        name: 'step1',
        execute: async () => success(),
      },
    ]
    const buildContext = async () => ({ branch: 'test' })

    runWorkflow(steps, buildContext, undefined, { io: mockIO })

    await vi.waitFor(() => {
      expect(mockIO.writeFileCalls).toHaveLength(0)
    })
  })

  it('writes output file when resolveOutputFilePath provided', async () => {
    const mockIO = createMockIO()
    const steps: Step<BaseContext>[] = [
      {
        name: 'step1',
        execute: async () => success({ data: 'result' }),
      },
    ]
    const buildContext = async () => ({ branch: 'test' })

    runWorkflow(steps, buildContext, undefined, {
      resolveOutputFilePath: () => 'reviews/test/output.json',
      io: mockIO,
    })

    await vi.waitFor(() => {
      const outputWrite = mockIO.writeFileCalls.find((c) => c.path.endsWith('output.json'))
      expect(outputWrite).toBeTruthy()
      expect(JSON.parse(outputWrite?.content ?? '{}')).toMatchObject({ data: 'result' })
    })
  })

  it('does not write output file when resolveOutputFilePath omitted', async () => {
    const mockIO = createMockIO()
    const steps: Step<BaseContext>[] = [
      {
        name: 'step1',
        execute: async () => success(),
      },
    ]
    const buildContext = async () => ({ branch: 'test' })

    runWorkflow(steps, buildContext, undefined, { io: mockIO })

    await vi.waitFor(() => {
      expect(mockIO.writeFileCalls.filter((c) => c.path.endsWith('output.json'))).toHaveLength(0)
    })
  })

  it('passes errorOutputFilePath to error handler when context builder throws', async () => {
    const mockIO = createMockIO()
    const steps: Step<BaseContext>[] = []
    const buildContext = async () => {
      throw new ContextBuildError()
    }

    runWorkflow(steps, buildContext, undefined, {
      errorOutputFilePath: 'reviews/error-output.json',
      io: mockIO,
    })

    await vi.waitFor(() => {
      expect(mockHandleError).toHaveBeenCalledWith(
        expect.any(ContextBuildError),
        'reviews/error-output.json',
      )
    })
  })

  it('uses default IO when io option not provided', async () => {
    const originalExit = process.exit
    const originalWrite = process.stdout.write
    const mockExit = vi.fn()
    const mockWrite = vi.fn(
      (
        _data: string | Uint8Array,
        encodingOrCb?: BufferEncoding | ((error?: Error | null) => void),
        cb?: (error?: Error | null) => void,
      ): boolean => {
        const callback = typeof encodingOrCb === 'function' ? encodingOrCb : cb
        if (callback) callback()
        return true
      },
    )
    Object.defineProperty(process, 'exit', {
      value: mockExit,
      configurable: true,
    })
    Object.defineProperty(process.stdout, 'write', {
      value: mockWrite,
      configurable: true,
    })
    const mockLog = vi.spyOn(console, 'log').mockImplementation(vi.fn())

    const steps: Step<BaseContext>[] = [
      {
        name: 'step1',
        execute: async () => success({ result: 'done' }),
      },
    ]
    const buildContext = async () => ({ branch: 'test' })

    runWorkflow(steps, buildContext)

    await vi.waitFor(() => {
      expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('result'))
      expect(mockExit).toHaveBeenCalledWith(0)
    })

    Object.defineProperty(process, 'exit', {
      value: originalExit,
      configurable: true,
    })
    Object.defineProperty(process.stdout, 'write', {
      value: originalWrite,
      configurable: true,
    })
    mockLog.mockRestore()
  })

  it('uses default IO writeFile (noop) when resolveTimingsFilePath provided without io', async () => {
    const originalExit = process.exit
    const originalWrite = process.stdout.write
    const mockExit = vi.fn()
    const mockWrite = vi.fn(
      (
        _data: string | Uint8Array,
        encodingOrCb?: BufferEncoding | ((error?: Error | null) => void),
        cb?: (error?: Error | null) => void,
      ): boolean => {
        const callback = typeof encodingOrCb === 'function' ? encodingOrCb : cb
        if (callback) callback()
        return true
      },
    )
    Object.defineProperty(process, 'exit', {
      value: mockExit,
      configurable: true,
    })
    Object.defineProperty(process.stdout, 'write', {
      value: mockWrite,
      configurable: true,
    })
    const mockLog = vi.spyOn(console, 'log').mockImplementation(vi.fn())

    const steps: Step<BaseContext>[] = [
      {
        name: 'step1',
        execute: async () => success(),
      },
    ]
    const buildContext = async () => ({ branch: 'test' })

    runWorkflow(steps, buildContext, undefined, { resolveTimingsFilePath: () => 'timings.md' })

    await vi.waitFor(() => {
      expect(mockExit).toHaveBeenCalledWith(0)
    })

    Object.defineProperty(process, 'exit', {
      value: originalExit,
      configurable: true,
    })
    Object.defineProperty(process.stdout, 'write', {
      value: originalWrite,
      configurable: true,
    })
    mockLog.mockRestore()
  })
})
