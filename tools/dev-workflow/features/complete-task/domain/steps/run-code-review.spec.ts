import {
  describe, it, expect, vi, beforeEach 
} from 'vitest'

const {
  mockReadFile,
  mockReaddirSync,
  mockClaude,
  mockGit,
  mockCli,
  mockTaskCheckMarkerExists,
  mockCreateTaskCheckMarker,
} = vi.hoisted(() => ({
  mockReadFile: vi.fn(),
  mockReaddirSync: vi.fn(),
  mockClaude: { query: vi.fn() },
  mockGit: {
    baseBranch: vi.fn(),
    diffFiles: vi.fn(),
    unpushedFiles: vi.fn(),
  },
  mockCli: { hasFlag: vi.fn() },
  mockTaskCheckMarkerExists: vi.fn(),
  mockCreateTaskCheckMarker: vi.fn(),
}))

vi.mock('node:fs/promises', () => ({ readFile: mockReadFile }))
vi.mock('node:fs', () => ({ readdirSync: mockReaddirSync }))
vi.mock('../../../../platform/infra/external-clients/claude-agent', () => ({ claude: mockClaude }))
vi.mock('../../../../platform/infra/external-clients/git-client', () => ({ git: mockGit }))
vi.mock('../../../../platform/infra/external-clients/cli-args', () => ({ cli: mockCli }))
vi.mock('../task-check-marker', () => ({
  taskCheckMarkerExists: mockTaskCheckMarkerExists,
  createTaskCheckMarker: mockCreateTaskCheckMarker,
}))

import {
  codeReview, AgentError 
} from './run-code-review'
import type { CompleteTaskContext } from '../task-to-complete'

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
    mockCli.hasFlag.mockReturnValue(false)
    mockReaddirSync.mockReturnValue([])
    mockGit.baseBranch.mockResolvedValue('main')
    mockGit.unpushedFiles.mockResolvedValue(['file1.ts'])
    mockTaskCheckMarkerExists.mockReturnValue(true)
    mockReadFile.mockResolvedValue('# Agent instructions')
    mockClaude.query.mockResolvedValue({ result: 'PASS' })
  })

  it('returns success when --reject-review-feedback flag is set', async () => {
    mockCli.hasFlag.mockReturnValue(true)
    const ctx = createContext({})

    const result = await codeReview.execute(ctx)

    expect(result.type).toBe('success')
    expect(mockClaude.query).not.toHaveBeenCalled()
  })

  it('returns failure when reviewDir is missing', async () => {
    const ctx = createContext({ reviewDir: undefined })

    const result = await codeReview.execute(ctx)

    expect(result.type).toBe('failure')
  })

  it('runs code-review and bug-scanner agents', async () => {
    const ctx = createContext({})

    await codeReview.execute(ctx)

    expect(mockClaude.query).toHaveBeenCalledTimes(2)
  })

  it('runs task-check agent when hasIssue and no marker', async () => {
    mockTaskCheckMarkerExists.mockReturnValue(false)
    const ctx = createContext({
      hasIssue: true,
      taskDetails: {
        title: 'Task',
        body: 'Details',
      },
    })

    await codeReview.execute(ctx)

    expect(mockClaude.query).toHaveBeenCalledTimes(3)
  })

  it('creates task-check marker when task-check passes', async () => {
    mockTaskCheckMarkerExists.mockReturnValue(false)
    const ctx = createContext({
      hasIssue: true,
      taskDetails: {
        title: 'Task',
        body: 'Details',
      },
    })

    await codeReview.execute(ctx)

    expect(mockCreateTaskCheckMarker).toHaveBeenCalledWith('./test-output')
  })

  it('returns failure when any reviewer fails', async () => {
    mockClaude.query.mockResolvedValue({ result: 'FAIL' })
    const ctx = createContext({})

    const result = await codeReview.execute(ctx)

    expect(result.type).toBe('failure')
  })

  it('returns success when all reviewers pass', async () => {
    const ctx = createContext({})

    const result = await codeReview.execute(ctx)

    expect(result.type).toBe('success')
  })

  it('throws AgentError when agent file cannot be read', async () => {
    mockReadFile.mockRejectedValue('file not found')
    const ctx = createContext({})

    await expect(codeReview.execute(ctx)).rejects.toThrow(AgentError)
  })

  it('uses round number 2 when round 1 report exists', async () => {
    mockReaddirSync.mockReturnValue(['code-review-1.md', 'bug-scanner-1.md'])
    const ctx = createContext({})

    await codeReview.execute(ctx)

    expect(mockClaude.query).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: expect.stringContaining('code-review-2.md') }),
    )
  })

  it('falls back to round 1 when directory does not exist', async () => {
    mockReaddirSync.mockImplementation(() => {
      throw new AgentError('ENOENT')
    })
    const ctx = createContext({})

    await codeReview.execute(ctx)

    expect(mockClaude.query).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: expect.stringContaining('code-review-1.md') }),
    )
  })
})
