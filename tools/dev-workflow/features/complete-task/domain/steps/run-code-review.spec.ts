import {
  describe, it, expect, vi, beforeEach 
} from 'vitest'

const {
  mockReadFile, mockReaddirSync, mockTaskCheckMarkerExists, mockCreateTaskCheckMarker 
} =
  vi.hoisted(() => ({
    mockReadFile: vi.fn(),
    mockReaddirSync: vi.fn(),
    mockTaskCheckMarkerExists: vi.fn(),
    mockCreateTaskCheckMarker: vi.fn(),
  }))

vi.mock('node:fs/promises', () => ({ readFile: mockReadFile }))
vi.mock('node:fs', () => ({ readdirSync: mockReaddirSync }))
vi.mock('../task-check-marker', () => ({
  taskCheckMarkerExists: mockTaskCheckMarkerExists,
  createTaskCheckMarker: mockCreateTaskCheckMarker,
}))

import {
  createCodeReviewStep, AgentError 
} from './run-code-review'
import type { CompleteTaskContext } from '../task-to-complete'

const mockQueryAgent = vi.fn()

function createContext(overrides: Partial<CompleteTaskContext> = {}): CompleteTaskContext {
  return {
    branch: 'test-branch',
    reviewDir: './test-output',
    hasIssue: false,
    commitMessage: 'test commit',
    prTitle: 'test title',
    prBody: 'test body',
    ...overrides,
  }
}

function createStep(skipReview = false) {
  return createCodeReviewStep({
    skipReview,
    baseBranch: vi.fn().mockResolvedValue('main'),
    unpushedFiles: vi.fn().mockResolvedValue(['file1.ts']),
    queryAgent: mockQueryAgent,
  })
}

describe('AgentError', () => {
  it('creates error with name AgentError', () => {
    const error = new AgentError('test message')

    expect(error.name).toBe('AgentError')
    expect(error.message).toBe('test message')
  })
})

describe('codeReview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockReaddirSync.mockReturnValue([])
    mockTaskCheckMarkerExists.mockReturnValue(true)
    mockReadFile.mockResolvedValue('# Agent instructions')
    mockQueryAgent.mockResolvedValue({ result: 'PASS' })
  })

  it('returns success when --reject-review-feedback flag is set', async () => {
    const step = createStep(true)
    const ctx = createContext({})

    const result = await step.execute(ctx)

    expect(result.type).toBe('success')
    expect(mockQueryAgent).not.toHaveBeenCalled()
  })

  it('returns failure when reviewDir is missing', async () => {
    const step = createStep()
    const ctx = createContext({ reviewDir: undefined })

    const result = await step.execute(ctx)

    expect(result.type).toBe('failure')
  })

  it('runs code-review and bug-scanner agents', async () => {
    const step = createStep()
    const ctx = createContext({})

    await step.execute(ctx)

    expect(mockQueryAgent).toHaveBeenCalledTimes(2)
  })

  it('runs task-check agent when hasIssue and no marker', async () => {
    mockTaskCheckMarkerExists.mockReturnValue(false)
    const step = createStep()
    const ctx = createContext({
      hasIssue: true,
      taskDetails: {
        title: 'Task',
        body: 'Details',
      },
    })

    await step.execute(ctx)

    expect(mockQueryAgent).toHaveBeenCalledTimes(3)
  })

  it('creates task-check marker when task-check passes', async () => {
    mockTaskCheckMarkerExists.mockReturnValue(false)
    const step = createStep()
    const ctx = createContext({
      hasIssue: true,
      taskDetails: {
        title: 'Task',
        body: 'Details',
      },
    })

    await step.execute(ctx)

    expect(mockCreateTaskCheckMarker).toHaveBeenCalledWith('./test-output')
  })

  it('returns failure when any reviewer fails', async () => {
    mockQueryAgent.mockResolvedValue({ result: 'FAIL' })
    const step = createStep()
    const ctx = createContext({})

    const result = await step.execute(ctx)

    expect(result.type).toBe('failure')
  })

  it('returns success when all reviewers pass', async () => {
    const step = createStep()
    const ctx = createContext({})

    const result = await step.execute(ctx)

    expect(result.type).toBe('success')
  })

  it('throws AgentError when agent file cannot be read', async () => {
    mockReadFile.mockRejectedValue('file not found')
    const step = createStep()
    const ctx = createContext({})

    await expect(step.execute(ctx)).rejects.toThrow(AgentError)
  })

  it('provides absolute report path in prompt', async () => {
    const step = createStep()
    const ctx = createContext({})

    await step.execute(ctx)

    expect(mockQueryAgent).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: expect.stringMatching(/Write your review report to: \//) }),
    )
  })

  it('uses round number 2 when round 1 report exists', async () => {
    mockReaddirSync.mockReturnValue(['code-review-1.md', 'bug-scanner-1.md'])
    const step = createStep()
    const ctx = createContext({})

    await step.execute(ctx)

    expect(mockQueryAgent).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: expect.stringContaining('code-review-2.md') }),
    )
  })

  it('falls back to round 1 when directory does not exist', async () => {
    mockReaddirSync.mockImplementation(() => {
      throw new AgentError('ENOENT')
    })
    const step = createStep()
    const ctx = createContext({})

    await step.execute(ctx)

    expect(mockQueryAgent).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: expect.stringContaining('code-review-1.md') }),
    )
  })
})
