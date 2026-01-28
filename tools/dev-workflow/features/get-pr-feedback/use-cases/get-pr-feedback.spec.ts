import {
  describe, it, expect, vi, beforeEach, afterEach 
} from 'vitest'
import type { GetPRFeedbackContext } from '../domain/feedback-report'

const { mockCurrentBranch } = vi.hoisted(() => ({ mockCurrentBranch: vi.fn() }))

const {
  mockGetPRWithState, mockFindPRForBranchWithState 
} = vi.hoisted(() => ({
  mockGetPRWithState: vi.fn(),
  mockFindPRForBranchWithState: vi.fn(),
}))

const {
  mockHasFlag, mockParseArg 
} = vi.hoisted(() => ({
  mockHasFlag: vi.fn(),
  mockParseArg: vi.fn(),
}))

const { mockRunWorkflow } = vi.hoisted(() => ({ mockRunWorkflow: vi.fn() }))

vi.mock('../../../platform/infra/external-clients/git-client', () => ({git: { currentBranch: mockCurrentBranch },}))

vi.mock('../../../platform/infra/external-clients/github-rest-client', () => ({
  github: {
    getPRWithState: mockGetPRWithState,
    findPRForBranchWithState: mockFindPRForBranchWithState,
  },
}))

vi.mock('../../../platform/infra/external-clients/cli-args', () => ({
  cli: {
    hasFlag: mockHasFlag,
    parseArg: mockParseArg,
  },
}))

vi.mock('../../../platform/domain/workflow-execution/run-workflow', () => ({runWorkflow: mockRunWorkflow,}))

import { executeGetPRFeedback } from './get-pr-feedback'

type ContextBuilder = () => Promise<GetPRFeedbackContext>

function isContextBuilder(value: unknown): value is ContextBuilder {
  return typeof value === 'function'
}

function getContextBuilder(): ContextBuilder {
  const builder: unknown = mockRunWorkflow.mock.calls[0][1]
  if (!isContextBuilder(builder)) {
    throw new TypeError('Expected context builder to be a function')
  }
  return builder
}

describe('executeGetPRFeedback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCurrentBranch.mockResolvedValue('feature-branch')
    mockHasFlag.mockReturnValue(false)
    mockParseArg.mockReturnValue(undefined)
    mockFindPRForBranchWithState.mockResolvedValue({
      number: 123,
      url: 'https://github.com/owner/repo/pull/123',
      state: 'open',
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls runWorkflow with steps and context builder', () => {
    executeGetPRFeedback()

    expect(mockRunWorkflow).toHaveBeenCalledWith(expect.any(Array), expect.any(Function))
  })

  it('context builder gets current branch', async () => {
    executeGetPRFeedback()
    await getContextBuilder()()

    expect(mockCurrentBranch).toHaveBeenCalledWith()
  })

  it('context builder checks for --include-resolved flag', async () => {
    executeGetPRFeedback()
    await getContextBuilder()()

    expect(mockHasFlag).toHaveBeenCalledWith('--include-resolved')
  })

  it('context builder parses --pr argument', async () => {
    executeGetPRFeedback()
    await getContextBuilder()()

    expect(mockParseArg).toHaveBeenCalledWith('--pr')
  })

  it('context builder finds PR for current branch when no --pr arg', async () => {
    mockFindPRForBranchWithState.mockResolvedValue({
      number: 456,
      url: 'https://github.com/owner/repo/pull/456',
      state: 'open',
    })

    executeGetPRFeedback()
    const context = await getContextBuilder()()

    expect(context.prNumber).toBe(456)
  })

  it('context builder returns PR URL when found', async () => {
    mockFindPRForBranchWithState.mockResolvedValue({
      number: 456,
      url: 'https://github.com/owner/repo/pull/456',
      state: 'open',
    })

    executeGetPRFeedback()
    const context = await getContextBuilder()()

    expect(context.prUrl).toBe('https://github.com/owner/repo/pull/456')
    expect(context.prState).toBe('open')
  })

  it('context builder uses --pr arg to fetch specific PR', async () => {
    mockParseArg.mockReturnValue('789')
    mockGetPRWithState.mockResolvedValue({
      number: 789,
      url: 'https://github.com/owner/repo/pull/789',
      state: 'merged',
    })

    executeGetPRFeedback()
    const context = await getContextBuilder()()

    expect(mockGetPRWithState).toHaveBeenCalledWith(789)
    expect(context.prNumber).toBe(789)
  })

  it('context builder fetches PR state from --pr arg', async () => {
    mockParseArg.mockReturnValue('789')
    mockGetPRWithState.mockResolvedValue({
      number: 789,
      url: 'https://github.com/owner/repo/pull/789',
      state: 'merged',
    })

    executeGetPRFeedback()
    const context = await getContextBuilder()()

    expect(context.prState).toBe('merged')
  })

  it('context builder throws when --pr arg is not a valid number', async () => {
    mockParseArg.mockReturnValue('not-a-number')

    executeGetPRFeedback()

    await expect(getContextBuilder()()).rejects.toThrow('Invalid --pr argument')
  })

  it('context builder returns undefined prNumber when no PR found', async () => {
    mockFindPRForBranchWithState.mockResolvedValue(undefined)

    executeGetPRFeedback()
    const context = await getContextBuilder()()

    expect(context.prNumber).toBeUndefined()
  })

  it('context builder returns undefined prUrl when no PR found', async () => {
    mockFindPRForBranchWithState.mockResolvedValue(undefined)

    executeGetPRFeedback()
    const context = await getContextBuilder()()

    expect(context.prUrl).toBeUndefined()
    expect(context.prState).toBeUndefined()
  })

  it('context builder includes includeResolved flag', async () => {
    mockHasFlag.mockReturnValue(true)

    executeGetPRFeedback()
    const context = await getContextBuilder()()

    expect(context.includeResolved).toBe(true)
  })
})
