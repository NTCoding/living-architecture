import {
  describe, it, expect, vi, beforeEach, afterEach 
} from 'vitest'

class TestWorkflowError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TestWorkflowError'
  }
}

const mockExecuteRespondToFeedback = vi.fn()
const mockProcessExit = vi.fn()

vi.mock('../use-cases/respond-to-feedback', () => ({executeRespondToFeedback: mockExecuteRespondToFeedback,}))

describe('respond-to-feedback CLI entrypoint', () => {
  const capturedErrors: string[] = []
  const originalExit = process.exit

  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    capturedErrors.length = 0
    vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      capturedErrors.push(args.join(' '))
    })
    Object.defineProperty(process, 'exit', {
      value: mockProcessExit,
      configurable: true,
    })
  })

  afterEach(() => {
    Object.defineProperty(process, 'exit', {
      value: originalExit,
      configurable: true,
    })
    vi.restoreAllMocks()
  })

  it('calls executeRespondToFeedback when imported', async () => {
    mockExecuteRespondToFeedback.mockResolvedValue(undefined)

    await import('./cli')
    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(mockExecuteRespondToFeedback).toHaveBeenCalledWith()
  })

  it('logs error and exits with code 1 when executeRespondToFeedback rejects with Error', async () => {
    mockExecuteRespondToFeedback.mockRejectedValue(new TestWorkflowError('Test error message'))

    await import('./cli')
    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(capturedErrors[0]).toBe('Error: Test error message')
    expect(mockProcessExit).toHaveBeenCalledWith(1)
  })

  it('logs error and exits with code 1 when executeRespondToFeedback rejects with non-Error', async () => {
    mockExecuteRespondToFeedback.mockRejectedValue('string error')

    await import('./cli')
    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(capturedErrors[0]).toBe('Error: string error')
    expect(mockProcessExit).toHaveBeenCalledWith(1)
  })
})
