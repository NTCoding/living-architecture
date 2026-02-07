import {
  describe, it, expect, vi, beforeEach 
} from 'vitest'
import { z } from 'zod'
import type { CompleteTaskContext } from '../domain/task-to-complete'
import type { WorkflowResult } from '../../../platform/domain/workflow-execution/workflow-runner'

const {
  mockMkdir,
  mockGit,
  mockGitHub,
  mockGhCli,
  mockRunWorkflow,
  mockCli,
  mockClaude,
  mockNx,
  mockFetchRawPRFeedback,
} = vi.hoisted(() => ({
  mockMkdir: vi.fn(),
  mockGit: {
    currentBranch: vi.fn(),
    baseBranch: vi.fn(),
    unpushedFiles: vi.fn(),
    unpushedFilesWithStatus: vi.fn(),
    uncommittedFiles: vi.fn(),
    push: vi.fn(),
  },
  mockGitHub: {
    getIssue: vi.fn(),
    findPRForBranch: vi.fn(),
    getPR: vi.fn(),
    createPR: vi.fn(),
  },
  mockGhCli: { watchCI: vi.fn() },
  mockRunWorkflow: vi.fn(),
  mockCli: {
    parseArg: vi.fn(),
    requireArg: vi.fn(),
    hasFlag: vi.fn(),
  },
  mockClaude: {
    query: vi.fn(),
    queryText: vi.fn(),
  },
  mockNx: { runMany: vi.fn() },
  mockFetchRawPRFeedback: vi.fn(),
}))

vi.mock('node:fs/promises', () => ({ mkdir: mockMkdir }))
vi.mock('../../../platform/infra/external-clients/git-client', () => ({ git: mockGit }))
vi.mock('../../../platform/infra/external-clients/github-rest-client', () => ({github: mockGitHub,}))
vi.mock('../../../platform/infra/external-clients/gh-cli', () => ({ ghCli: mockGhCli }))
vi.mock('../../../platform/domain/workflow-execution/run-workflow', () => ({runWorkflow: mockRunWorkflow,}))
vi.mock('../../../platform/infra/external-clients/cli-args', () => ({ cli: mockCli }))
vi.mock('../../../platform/infra/external-clients/claude-agent', () => ({ claude: mockClaude }))
vi.mock('../../../platform/infra/external-clients/nx-runner', () => ({ nx: mockNx }))
vi.mock('../../../platform/infra/external-clients/github-graphql-client', () => ({fetchRawPRFeedback: mockFetchRawPRFeedback,}))

import {
  executeCompleteTask, resolveTimingsFilePath 
} from './complete-task'

type ContextBuilder = () => Promise<CompleteTaskContext>
type ResultFormatter = (result: WorkflowResult, ctx: CompleteTaskContext) => unknown

const contextBuilderSchema = z.custom<ContextBuilder>(
  (val): val is ContextBuilder => typeof val === 'function',
  { message: 'Expected context builder to be a function' },
)

const resultFormatterSchema = z.custom<ResultFormatter>(
  (val): val is ResultFormatter => typeof val === 'function',
  { message: 'Expected result formatter to be a function' },
)

function getContextBuilder(): ContextBuilder {
  return contextBuilderSchema.parse(mockRunWorkflow.mock.calls[0][1])
}

function getResultFormatter(): ResultFormatter {
  return resultFormatterSchema.parse(mockRunWorkflow.mock.calls[0][2])
}

function buildTestContext(): CompleteTaskContext {
  return {
    branch: 'test-branch',
    reviewDir: 'reviews/test',
    prMode: 'create',
    hasIssue: false,
    prTitle: 'test',
    prBody: 'test',
  }
}

describe('executeCompleteTask', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockMkdir.mockResolvedValue(undefined)
    mockGit.currentBranch.mockResolvedValue('issue-123-test-branch')
    mockGitHub.getIssue.mockResolvedValue({
      title: 'feat: test issue',
      body: 'Test body',
    })
    mockGitHub.findPRForBranch.mockResolvedValue(undefined)
    mockCli.parseArg.mockReturnValue(undefined)
    mockCli.requireArg.mockImplementation((flag: string) => {
      if (flag === '--prmode') return 'create'
      return undefined
    })
    mockCli.hasFlag.mockReturnValue(false)
  })

  it('calls runWorkflow with steps and context builder', () => {
    executeCompleteTask()

    expect(mockRunWorkflow).toHaveBeenCalledWith(
      expect.any(Array),
      expect.any(Function),
      expect.any(Function),
      expect.objectContaining({ resolveTimingsFilePath: expect.any(Function) }),
    )
  })

  it('resolves timings file path from review directory', () => {
    const ctx = buildTestContext()
    const path = resolveTimingsFilePath(ctx)
    expect(path).toBe('reviews/test/timings.md')
  })

  it('rejects --reject-review-feedback in create mode', () => {
    mockCli.hasFlag.mockImplementation((flag: string) => flag === '--reject-review-feedback')
    mockCli.requireArg.mockImplementation((flag: string) => {
      if (flag === '--prmode') return 'create'
      return undefined
    })

    expect(() => executeCompleteTask()).toThrow(
      '--reject-review-feedback can only be used with --prmode update',
    )
  })

  it('allows --reject-review-feedback in update mode', () => {
    mockCli.hasFlag.mockImplementation((flag: string) => flag === '--reject-review-feedback')
    mockCli.requireArg.mockImplementation((flag: string) => {
      if (flag === '--prmode') return 'update'
      return undefined
    })

    executeCompleteTask()

    expect(mockRunWorkflow).toHaveBeenCalledWith(
      expect.any(Array),
      expect.any(Function),
      expect.any(Function),
      expect.any(Object),
    )
  })

  it('passes workflow steps in correct order', () => {
    executeCompleteTask()

    const steps: unknown[] = mockRunWorkflow.mock.calls[0][0]
    const stepNames = steps.map((s) => {
      const step = s && typeof s === 'object' && 'name' in s ? s : null
      return step?.name
    })
    expect(stepNames).toStrictEqual([
      'verify-build',
      'code-review',
      'submit-pr',
      'fetch-pr-feedback',
    ])
  })

  it('context builder creates review directory', async () => {
    executeCompleteTask()

    await getContextBuilder()()

    expect(mockMkdir).toHaveBeenCalledWith(expect.stringContaining('reviews/'), { recursive: true })
  })

  it('context builder parses issue number from branch', async () => {
    mockGit.currentBranch.mockResolvedValue('issue-456-feature')
    executeCompleteTask()

    await getContextBuilder()()

    expect(mockGitHub.getIssue).toHaveBeenCalledWith(456)
  })

  it('context builder handles non-issue branches', async () => {
    mockGit.currentBranch.mockResolvedValue('feature-branch')
    mockCli.parseArg.mockImplementation((arg: string) => {
      if (arg === '--pr-title') return 'feat: PR title'
      if (arg === '--pr-body') return 'PR body'
      return undefined
    })
    executeCompleteTask()

    await getContextBuilder()()

    expect(mockGitHub.getIssue).not.toHaveBeenCalled()
  })

  it('context builder sanitizes branch name for path', async () => {
    mockGit.currentBranch.mockResolvedValue('feature/with/slashes')
    mockCli.parseArg.mockImplementation((arg: string) => {
      if (arg === '--pr-title') return 'feat: PR title'
      if (arg === '--pr-body') return 'PR body'
      return undefined
    })
    executeCompleteTask()

    await getContextBuilder()()

    expect(mockMkdir).toHaveBeenCalledWith('reviews/feature_with_slashes', expect.any(Object))
  })

  it('context builder includes existing PR number in update mode', async () => {
    mockGitHub.findPRForBranch.mockResolvedValue(789)
    mockCli.requireArg.mockImplementation((flag: string) => {
      if (flag === '--prmode') return 'update'
      if (flag === '--feedback-items-resolved') return '3'
      if (flag === '--feedback-items-remaining') return '0'
      return undefined
    })
    executeCompleteTask()

    const context = await getContextBuilder()()

    expect(context.prNumber).toBe(789)
  })

  it('context builder rejects create mode when PR already exists', async () => {
    mockGitHub.findPRForBranch.mockResolvedValue(789)
    executeCompleteTask()

    await expect(getContextBuilder()()).rejects.toThrow('PR #789 already exists')
  })

  it('context builder rejects update mode when no PR exists', async () => {
    mockCli.requireArg.mockImplementation((flag: string) => {
      if (flag === '--prmode') return 'update'
      if (flag === '--feedback-items-resolved') return '3'
      if (flag === '--feedback-items-remaining') return '0'
      return undefined
    })
    executeCompleteTask()

    await expect(getContextBuilder()()).rejects.toThrow('No PR exists')
  })

  it('context builder rejects update mode when feedback items remaining', async () => {
    mockGitHub.findPRForBranch.mockResolvedValue(789)
    mockCli.requireArg.mockImplementation((flag: string) => {
      if (flag === '--prmode') return 'update'
      if (flag === '--feedback-items-resolved') return '2'
      if (flag === '--feedback-items-remaining') return '3'
      return undefined
    })
    executeCompleteTask()

    await expect(getContextBuilder()()).rejects.toThrow('3 feedback items remaining')
  })

  it('context builder rejects invalid prmode value', async () => {
    mockCli.requireArg.mockImplementation((flag: string) => {
      if (flag === '--prmode') return 'invalid'
      return undefined
    })
    executeCompleteTask()

    await expect(getContextBuilder()()).rejects.toThrow("--prmode must be 'create' or 'update'")
  })

  it('context builder rejects non-integer feedback-items-remaining', async () => {
    mockGitHub.findPRForBranch.mockResolvedValue(789)
    mockCli.requireArg.mockImplementation((flag: string) => {
      if (flag === '--prmode') return 'update'
      if (flag === '--feedback-items-resolved') return '2'
      if (flag === '--feedback-items-remaining') return 'abc'
      return undefined
    })
    executeCompleteTask()

    await expect(getContextBuilder()()).rejects.toThrow('must be a non-negative integer')
  })

  it('result formatter is passed to runWorkflow', () => {
    executeCompleteTask()

    const formatter = mockRunWorkflow.mock.calls[0][2]
    expect(typeof formatter).toBe('function')
  })

  it('result formatter invokes formatCompleteTaskResult', () => {
    executeCompleteTask()

    const mockResult: WorkflowResult = {
      success: true,
      stepTimings: [],
      totalDurationMs: 0,
    }
    const mockCtx: CompleteTaskContext = {
      branch: 'test-branch',
      reviewDir: 'reviews/test',
      prMode: 'create',
      hasIssue: false,
      issueNumber: undefined,
      taskDetails: undefined,
      prTitle: 'test pr',
      prBody: 'test body',
      prNumber: undefined,
    }

    const result = getResultFormatter()(mockResult, mockCtx)

    expect(result).toHaveProperty('success', true)
  })
})
