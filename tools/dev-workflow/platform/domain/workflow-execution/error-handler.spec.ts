import {
  describe, it, expect, vi, beforeEach 
} from 'vitest'
import { z } from 'zod'
import { handleWorkflowError } from './error-handler'

class TestExitSignal extends Error {
  constructor() {
    super('process.exit called')
    this.name = 'TestExitSignal'
  }
}

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
    vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new TestExitSignal()
    })
    vi.spyOn(console, 'error').mockImplementation((msg: string) => {
      capturedOutput.push(msg)
    })
  })

  it('logs error message for Error instance', () => {
    const testError = Object.assign(Object.create(Error.prototype), {
      name: 'TestError',
      message: 'Test error message',
    })
    try {
      handleWorkflowError(testError)
    } catch {
      // TestExitSignal expected
    }
    expect(capturedOutput[0]).toContain('Test error message')
  })

  it('logs string error for non-Error value', () => {
    try {
      handleWorkflowError('string error')
    } catch {
      // TestExitSignal expected
    }
    expect(capturedOutput[0]).toContain('string error')
  })

  it('exits with code 1', () => {
    const mockExit = vi.spyOn(process, 'exit')
    const testError = Object.assign(Object.create(Error.prototype), {
      name: 'TestError',
      message: 'test',
    })
    try {
      handleWorkflowError(testError)
    } catch {
      // TestExitSignal expected
    }
    expect(mockExit).toHaveBeenCalledWith(1)
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
    try {
      handleWorkflowError(testError)
    } catch {
      // TestExitSignal expected
    }
    const parsed = errorOutputSchema.parse(JSON.parse(capturedOutput[0] ?? '{}'))
    expect(parsed.stack).toBeDefined()
  })

  it('outputs JSON with fix_errors action', () => {
    class ActionError extends Error {
      constructor() {
        super('test')
        this.name = 'ActionError'
      }
    }
    try {
      handleWorkflowError(new ActionError())
    } catch {
      // TestExitSignal expected
    }
    const parsed = errorOutputSchema.parse(JSON.parse(capturedOutput[0] ?? '{}'))
    expect(parsed.nextAction).toStrictEqual('fix_errors')
    expect(parsed.success).toStrictEqual(false)
  })
})
