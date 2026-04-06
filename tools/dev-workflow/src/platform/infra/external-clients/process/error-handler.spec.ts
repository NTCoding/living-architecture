import {
  describe, it, expect, vi, beforeEach, afterEach 
} from 'vitest'
import { z } from 'zod'
import { writeFileSync } from 'node:fs'
import { handleWorkflowError } from './error-handler'

vi.mock('node:fs', () => ({ writeFileSync: vi.fn() }))

const errorOutputSchema = z.object({
  success: z.literal(false),
  nextAction: z.string(),
  nextInstructions: z.string(),
  stack: z.string().optional(),
})

const mockProcessExit = vi.fn()
const mockStderrWrite = vi.fn(
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

describe('handleWorkflowError', () => {
  const capturedOutput: string[] = []
  const originalExit = process.exit
  const originalWrite = process.stderr.write

  beforeEach(() => {
    vi.clearAllMocks()
    capturedOutput.length = 0
    Object.defineProperty(process, 'exit', {
      value: mockProcessExit,
      configurable: true,
    })
    Object.defineProperty(process.stderr, 'write', {
      value: mockStderrWrite,
      configurable: true,
    })
    vi.spyOn(console, 'error').mockImplementation((msg: string) => {
      capturedOutput.push(msg)
    })
  })

  afterEach(() => {
    Object.defineProperty(process, 'exit', {
      value: originalExit,
      configurable: true,
    })
    Object.defineProperty(process.stderr, 'write', {
      value: originalWrite,
      configurable: true,
    })
    vi.restoreAllMocks()
  })

  it('logs error message for Error instance', () => {
    const testError = Object.assign(Object.create(Error.prototype), {
      name: 'TestError',
      message: 'Test error message',
    })
    handleWorkflowError(testError)
    expect(capturedOutput[0]).toContain('Test error message')
  })

  it('logs string error for non-Error value', () => {
    handleWorkflowError('string error')
    expect(capturedOutput[0]).toContain('string error')
  })

  it('flushes stderr then exits with code 1', async () => {
    const testError = Object.assign(Object.create(Error.prototype), {
      name: 'TestError',
      message: 'test',
    })
    handleWorkflowError(testError)
    await vi.waitFor(() => {
      expect(mockProcessExit).toHaveBeenCalledWith(1)
    })
  })

  it('includes stack trace for Error instance', () => {
    class StackError extends Error {
      constructor() {
        super('Test error')
        this.name = 'StackError'
        this.stack = 'Error: Test error\n    at test.ts:1:1'
      }
    }
    const testError = new StackError()
    handleWorkflowError(testError)
    const parsed = errorOutputSchema.parse(JSON.parse(capturedOutput[0] ?? '{}'))
    expect(parsed.stack).toContain('Error: Test error')
  })

  it('outputs JSON with fix_errors action', () => {
    class ActionError extends Error {
      constructor() {
        super('test')
        this.name = 'ActionError'
      }
    }
    handleWorkflowError(new ActionError())
    const parsed = errorOutputSchema.parse(JSON.parse(capturedOutput[0] ?? '{}'))
    expect(parsed.nextAction).toStrictEqual('fix_errors')
    expect(parsed.success).toStrictEqual(false)
  })

  it('writes error output to file when outputFilePath provided', () => {
    class FileTestError extends Error {
      constructor() {
        super('file test')
        this.name = 'FileTestError'
      }
    }
    handleWorkflowError(new FileTestError(), 'reviews/error-output.json')
    expect(writeFileSync).toHaveBeenCalledWith(
      'reviews/error-output.json',
      expect.stringContaining('file test'),
      'utf-8',
    )
  })

  it('does not write file when outputFilePath omitted', () => {
    class NoFileError extends Error {
      constructor() {
        super('no file')
        this.name = 'NoFileError'
      }
    }
    handleWorkflowError(new NoFileError())
    expect(writeFileSync).not.toHaveBeenCalled()
  })
})
