import {
  describe, it, expect, vi, beforeEach 
} from 'vitest'
import type { CompleteTaskContext } from '../domain/task-to-complete'
import type { WorkflowResult } from '../../../platform/domain/workflow-execution/workflow-runner'

const {
  mockMkdir, mockGit, mockGitHub, mockRunWorkflow, mockCli 
} = vi.hoisted(() => ({
  mockMkdir: vi.fn(),
  mockGit: { currentBranch: vi.fn() },
  mockGitHub: {
    getIssue: vi.fn(),
    findPRForBranch: vi.fn(),
  },
  mockRunWorkflow: vi.fn(),
  mockCli: { parseArg: vi.fn() },
}))

vi.mock('node:fs/promises', () => ({ mkdir: mockMkdir }))
vi.mock('../../../platform/infra/external-clients/git-client', () => ({ git: mockGit }))
vi.mock('../../../platform/infra/external-clients/github-rest-client', () => ({github: mockGitHub,}))
vi.mock('../../../platform/domain/workflow-execution/run-workflow', () => ({runWorkflow: mockRunWorkflow,}))
vi.mock('../../../platform/infra/external-clients/cli-args', () => ({ cli: mockCli }))

import { executeCompleteTask } from './complete-task'

type ContextBuilder = () => Promise<CompleteTaskContext>
type ResultFormatter = (result: WorkflowResult, ctx: CompleteTaskContext) => unknown

function isContextBuilder(value: unknown): value is ContextBuilder {
  return typeof value === 'function'
}

function isResultFormatter(value: unknown): value is ResultFormatter {
  return typeof value === 'function'
}

function getContextBuilder(): ContextBuilder {
  const builder: unknown = mockRunWorkflow.mock.calls[0][1]
  if (!isContextBuilder(builder)) {
    throw new TypeError('Expected context builder to be a function')
  }
  return builder
}

function getResultFormatter(): ResultFormatter {
  const formatter: unknown = mockRunWorkflow.mock.calls[0][2]
  if (!isResultFormatter(formatter)) {
    throw new TypeError('Expected result formatter to be a function')
  }
  return formatter
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
    mockCli.parseArg.mockImplementation((arg: string) => {
      if (arg === '--commit-message') return 'feat: test commit'
      return undefined
    })
  })

  it('calls runWorkflow with steps and context builder', () => {
    executeCompleteTask()

    expect(mockRunWorkflow).toHaveBeenCalledWith(
      expect.any(Array),
      expect.any(Function),
      expect.any(Function),
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
      if (arg === '--commit-message') return 'feat: commit'
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
      if (arg === '--commit-message') return 'feat: commit'
      return undefined
    })
    executeCompleteTask()

    await getContextBuilder()()

    expect(mockMkdir).toHaveBeenCalledWith('reviews/feature_with_slashes', expect.any(Object))
  })

  it('context builder includes existing PR number', async () => {
    mockGitHub.findPRForBranch.mockResolvedValue(789)
    executeCompleteTask()

    const context = await getContextBuilder()()

    expect(context.prNumber).toBe(789)
  })

  it('result formatter is passed to runWorkflow', () => {
    executeCompleteTask()

    const formatter = mockRunWorkflow.mock.calls[0][2]
    expect(typeof formatter).toBe('function')
  })

  it('result formatter invokes formatCompleteTaskResult', () => {
    executeCompleteTask()

    const mockResult: WorkflowResult = { success: true }
    const mockCtx: CompleteTaskContext = {
      branch: 'test-branch',
      reviewDir: 'reviews/test',
      hasIssue: false,
      issueNumber: undefined,
      taskDetails: undefined,
      commitMessage: 'test commit',
      prTitle: 'test pr',
      prBody: 'test body',
      prNumber: undefined,
    }

    const result = getResultFormatter()(mockResult, mockCtx)

    expect(result).toHaveProperty('success', true)
  })
})
