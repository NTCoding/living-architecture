import {
  describe, it, expect, vi, beforeEach 
} from 'vitest'
import { z } from 'zod'

const {
  mockReadFile,
  mockWriteFile,
  mockReaddirSync,
  mockTaskCheckMarkerExists,
  mockCreateTaskCheckMarker,
} = vi.hoisted(() => ({
  mockReadFile: vi.fn(),
  mockWriteFile: vi.fn(),
  mockReaddirSync: vi.fn(),
  mockTaskCheckMarkerExists: vi.fn(),
  mockCreateTaskCheckMarker: vi.fn(),
}))

vi.mock('node:fs/promises', () => ({
  readFile: mockReadFile,
  writeFile: mockWriteFile,
}))
vi.mock('node:fs', () => ({ readdirSync: mockReaddirSync }))
vi.mock('../task-check-marker', () => ({
  taskCheckMarkerExists: mockTaskCheckMarkerExists,
  createTaskCheckMarker: mockCreateTaskCheckMarker,
}))

import {
  createCodeReviewStep,
  AgentError,
  type ReviewerResponse,
  type CodeReviewDeps,
} from './run-code-review'
import type { CompleteTaskContext } from '../task-to-complete'

const queryAgentOptsSchema = z.object({
  prompt: z.string(),
  model: z.enum(['opus', 'sonnet', 'haiku']),
  outputSchema: z.any(),
  settingSources: z.array(z.enum(['user', 'project', 'local'])).optional(),
})

const mockQueryAgent = vi.fn()

function createContext(overrides: Partial<CompleteTaskContext> = {}): CompleteTaskContext {
  return {
    branch: 'test-branch',
    reviewDir: './test-output',
    prMode: 'create',
    hasIssue: false,
    prTitle: 'test title',
    prBody: 'test body',
    ...overrides,
  }
}

function createStep(skipReview = false) {
  const deps = {
    skipReview,
    baseBranch: vi.fn().mockResolvedValue('main'),
    unpushedFiles: vi.fn().mockResolvedValue(['file1.ts']),
    queryAgent: mockQueryAgent,
  } satisfies CodeReviewDeps
  return createCodeReviewStep(deps)
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
    mockWriteFile.mockResolvedValue(undefined)
    mockQueryAgent.mockResolvedValue({ verdict: 'PASS' } satisfies ReviewerResponse)
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

  it('runs architecture-review, code-review and bug-scanner agents', async () => {
    const step = createStep()
    const ctx = createContext({})

    await step.execute(ctx)

    expect(mockQueryAgent).toHaveBeenCalledTimes(3)
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

    expect(mockQueryAgent).toHaveBeenCalledTimes(4)
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
    mockQueryAgent.mockResolvedValue({ verdict: 'FAIL' } satisfies ReviewerResponse)
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

  it('returns failure when agent file cannot be read', async () => {
    mockReadFile.mockRejectedValue(new AgentError('file not found'))
    const step = createStep()
    const ctx = createContext({})

    const result = await step.execute(ctx)

    expect(result.type).toBe('failure')
  })

  it('does not write report to disk — agents write directly', async () => {
    const step = createStep()
    const ctx = createContext({})

    await step.execute(ctx)

    expect(mockWriteFile).not.toHaveBeenCalled()
  })

  it('passes round 2 report path in prompt when round 1 report exists', async () => {
    mockReaddirSync.mockReturnValue(['code-review-1.md', 'bug-scanner-1.md'])
    const step = createStep()
    const ctx = createContext({})

    await step.execute(ctx)

    const codeReviewCall = mockQueryAgent.mock.calls.find((call) => {
      const parsed = queryAgentOptsSchema.safeParse(call[0])
      return parsed.success && parsed.data.prompt.includes('code-review')
    })
    const parsed = queryAgentOptsSchema.parse(codeReviewCall?.[0])
    expect(parsed.prompt).toContain('code-review-2.md')
  })

  it('passes round 1 report path in prompt when directory does not exist', async () => {
    mockReaddirSync.mockImplementation(() => {
      throw new AgentError('ENOENT')
    })
    const step = createStep()
    const ctx = createContext({})

    await step.execute(ctx)

    const codeReviewCall = mockQueryAgent.mock.calls.find((call) => {
      const parsed = queryAgentOptsSchema.safeParse(call[0])
      return parsed.success && parsed.data.prompt.includes('code-review')
    })
    const parsed = queryAgentOptsSchema.parse(codeReviewCall?.[0])
    expect(parsed.prompt).toContain('code-review-1.md')
  })

  it('returns retriable failure when agent query throws', async () => {
    mockQueryAgent.mockRejectedValue(new AgentError('API Error: 400'))
    const step = createStep()
    const ctx = createContext({})

    const result = await step.execute(ctx)

    expect(result.type).toBe('failure')
  })

  it('returns retriable failure when agent query throws non-Error', async () => {
    mockQueryAgent.mockRejectedValue('string error')
    const step = createStep()
    const ctx = createContext({})

    const result = await step.execute(ctx)

    expect(result.type).toBe('failure')
  })
})
