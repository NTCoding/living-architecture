import {
  describe, it, expect 
} from 'vitest'
import {
  WorkflowError, workflow, type BaseContext, type Step 
} from './workflow-runner'
import {
  success, failure 
} from './step-result'

describe('WorkflowError', () => {
  it('creates error with message', () => {
    const error = new WorkflowError('Test error')
    expect(error.message).toBe('Test error')
    expect(error.name).toBe('WorkflowError')
  })

  it('is instanceof Error', () => {
    const error = new WorkflowError('Test')
    expect(error).toBeInstanceOf(Error)
  })
})

describe('workflow', () => {
  const createContext = (): BaseContext => ({ branch: 'test-branch' })

  it('returns success when all steps succeed', async () => {
    const steps: Step<BaseContext>[] = [
      {
        name: 'step1',
        execute: async () => success(),
      },
      {
        name: 'step2',
        execute: async () => success(),
      },
    ]
    const run = workflow(steps)
    const result = await run(createContext())
    expect(result.success).toBe(true)
  })

  it('returns failure when a step fails', async () => {
    const steps: Step<BaseContext>[] = [
      {
        name: 'step1',
        execute: async () => success(),
      },
      {
        name: 'step2',
        execute: async () => failure('step2 failed'),
      },
    ]
    const run = workflow(steps)
    const result = await run(createContext())
    expect(result.success).toBe(false)
    expect(result.failedStep).toBe('step2')
    expect(result.error).toBe('step2 failed')
  })

  it('stops execution after first failure', async () => {
    const tracker = { step3Called: false }
    const steps: Step<BaseContext>[] = [
      {
        name: 'step1',
        execute: async () => success(),
      },
      {
        name: 'step2',
        execute: async () => failure('error'),
      },
      {
        name: 'step3',
        execute: async () => {
          tracker.step3Called = true
          return success()
        },
      },
    ]
    const run = workflow(steps)
    await run(createContext())
    expect(tracker.step3Called).toBe(false)
  })

  it('passes output from step to context', async () => {
    const steps: Step<BaseContext>[] = [
      {
        name: 'step1',
        execute: async () => success('output-from-step1'),
      },
    ]
    const run = workflow(steps)
    const ctx = createContext()
    await run(ctx)
    expect(ctx.output).toBe('output-from-step1')
  })

  it('returns output in result on success', async () => {
    const steps: Step<BaseContext>[] = [
      {
        name: 'step1',
        execute: async () => success('final-output'),
      },
    ]
    const run = workflow(steps)
    const result = await run(createContext())
    expect(result.output).toBe('final-output')
  })

  it('does not set output when step returns undefined output', async () => {
    const ctx = createContext()
    ctx.output = 'initial'
    const steps: Step<BaseContext>[] = [
      {
        name: 'step1',
        execute: async () => success(),
      },
    ]
    const run = workflow(steps)
    await run(ctx)
    expect(ctx.output).toBe('initial')
  })
})
