import {
  describe, it, expect, vi, beforeEach, afterEach 
} from 'vitest'
import { z } from 'zod'
import { handleWorkflowError } from './error-handler'

const errorOutputSchema = z.object({
  success: z.literal(false),
  nextAction: z.string(),
  nextInstructions: z.string(),
  stack: z.string().optional(),
})

describe('handleWorkflowError', () => {
  const capturedOutput: string[] = []

  beforeEach(() => {
    capturedOutput.length = 0
    process.exitCode = undefined
    vi.spyOn(console, 'error').mockImplementation((msg: string) => {
      capturedOutput.push(msg)
    })
  })

  afterEach(() => {
    process.exitCode = undefined
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

  it('sets exit code to 1', () => {
    const testError = Object.assign(Object.create(Error.prototype), {
      name: 'TestError',
      message: 'test',
    })
    handleWorkflowError(testError)
    expect(process.exitCode).toBe(1)
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
})
