import {
  describe, it, expect, vi, beforeEach 
} from 'vitest'

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
  createCodeReviewStep, AgentError 
} from './run-code-review'
import type { CodeReviewDeps } from './run-code-review'
import type { CompleteTaskContext } from '../task-to-complete'

const mockQueryAgentText = vi.fn<CodeReviewDeps['queryAgentText']>()

function resolveReviewerName(prompt: string): string {
  if (prompt.includes('architecture-review')) return 'architecture-review'
  if (prompt.includes('bug-scanner')) return 'bug-scanner'
  return 'code-review'
}

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
  return createCodeReviewStep({
    skipReview,
    baseBranch: vi.fn().mockResolvedValue('main'),
    unpushedFiles: vi.fn().mockResolvedValue([
      {
        path: 'file1.ts',
        deleted: false,
      },
    ]),
    queryAgentText: mockQueryAgentText,
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
    mockWriteFile.mockResolvedValue(undefined)
    mockQueryAgentText.mockResolvedValue('PASS\nAll checks passed.')
  })

  it('returns success when --reject-review-feedback flag is set', async () => {
    const step = createStep(true)
    const ctx = createContext({})

    const result = await step.execute(ctx)

    expect(result.type).toBe('success')
    expect(mockQueryAgentText).not.toHaveBeenCalled()
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

    expect(mockQueryAgentText).toHaveBeenCalledTimes(3)
  })

  it('uses opus for architecture-review and sonnet for code-review and bug-scanner', async () => {
    const step = createStep()
    const ctx = createContext({})

    await step.execute(ctx)

    const calls = mockQueryAgentText.mock.calls
    const modelByReviewer = Object.fromEntries(
      calls.map((call) => {
        const prompt = String(call[0].prompt)
        const reviewer = resolveReviewerName(prompt)
        return [reviewer, call[0].model]
      }),
    )
    expect(modelByReviewer).toStrictEqual({
      'architecture-review': 'opus',
      'code-review': 'sonnet',
      'bug-scanner': 'sonnet',
    })
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

    expect(mockQueryAgentText).toHaveBeenCalledTimes(4)
  })

  it('uses opus for task-check reviewer', async () => {
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

    const taskCheckCall = mockQueryAgentText.mock.calls.find((call) =>
      String(call[0].prompt).includes('task-check'),
    )
    expect(taskCheckCall?.[0].model).toBe('opus')
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
    mockQueryAgentText.mockResolvedValue('FAIL\nIssues found.')
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

    const codeReviewCall = mockQueryAgentText.mock.calls.find((call) =>
      String(call[0].prompt).includes('code-review'),
    )
    expect(codeReviewCall?.[0].prompt).toContain('code-review-2.md')
  })

  it('passes round 1 report path in prompt when directory does not exist', async () => {
    mockReaddirSync.mockImplementation(() => {
      throw new AgentError('ENOENT')
    })
    const step = createStep()
    const ctx = createContext({})

    await step.execute(ctx)

    const codeReviewCall = mockQueryAgentText.mock.calls.find((call) =>
      String(call[0].prompt).includes('code-review'),
    )
    expect(codeReviewCall?.[0].prompt).toContain('code-review-1.md')
  })

  it('returns retriable failure when agent query throws', async () => {
    mockQueryAgentText.mockRejectedValue(new AgentError('API Error: 400'))
    const step = createStep()
    const ctx = createContext({})

    const result = await step.execute(ctx)

    expect(result.type).toBe('failure')
  })

  it('returns retriable failure when agent query throws non-Error', async () => {
    mockQueryAgentText.mockRejectedValue('string error')
    const step = createStep()
    const ctx = createContext({})

    const result = await step.execute(ctx)

    expect(result.type).toBe('failure')
  })

  it('returns failure when agent response has invalid verdict', async () => {
    mockQueryAgentText.mockResolvedValue('INVALID_VERDICT\nsome report content')
    const step = createStep()
    const ctx = createContext({})

    const result = await step.execute(ctx)

    expect(result.type).toBe('failure')
  })

  it('returns failure when agent response has no newline', async () => {
    mockQueryAgentText.mockResolvedValue('single line without newline')
    const step = createStep()
    const ctx = createContext({})

    const result = await step.execute(ctx)

    expect(result.type).toBe('failure')
  })

  it('parses bold markdown verdict like **PASS**', async () => {
    mockQueryAgentText.mockResolvedValue(
      '**PASS** — All acceptance criteria satisfied.\nDetailed report here.',
    )
    const step = createStep()
    const ctx = createContext({})

    const result = await step.execute(ctx)

    expect(result.type).toBe('success')
  })

  it('parses bold markdown FAIL verdict', async () => {
    mockQueryAgentText.mockResolvedValue('**FAIL** — Issues found.\nDetails here.')
    const step = createStep()
    const ctx = createContext({})

    const result = await step.execute(ctx)

    expect(result.type).toBe('failure')
  })

  it('finds verdict within first 5 lines when agent narrates before verdict', async () => {
    mockQueryAgentText.mockResolvedValue(
      'Now I have all the information.\nLet me complete the audit.\nPASS\nAll checks passed.',
    )
    const step = createStep()
    const ctx = createContext({})

    const result = await step.execute(ctx)

    expect(result.type).toBe('success')
  })

  it('finds verdict beyond first 5 lines when agent narrates extensively', async () => {
    mockQueryAgentText.mockResolvedValue(
      'line1\nline2\nline3\nline4\nline5\nPASS\nAll checks passed.',
    )
    const step = createStep()
    const ctx = createContext({})

    const result = await step.execute(ctx)

    expect(result.type).toBe('success')
  })

  it('annotates deleted files with [DELETED] prefix in agent prompt', async () => {
    const step = createCodeReviewStep({
      skipReview: false,
      baseBranch: vi.fn().mockResolvedValue('main'),
      unpushedFiles: vi.fn().mockResolvedValue([
        {
          path: 'modified.ts',
          deleted: false,
        },
        {
          path: 'removed.ts',
          deleted: true,
        },
      ]),
      queryAgentText: mockQueryAgentText,
    })
    const ctx = createContext({})

    await step.execute(ctx)

    const firstCall = mockQueryAgentText.mock.calls[0]
    const prompt = String(firstCall?.[0].prompt)
    expect(prompt).toContain('modified.ts')
    expect(prompt).toContain('[DELETED] removed.ts')
    expect(prompt).not.toContain('[DELETED] modified.ts')
  })
})
