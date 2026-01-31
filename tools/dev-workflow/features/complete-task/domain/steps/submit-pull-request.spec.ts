import {
  describe, it, expect, vi, beforeEach 
} from 'vitest'
import { createSubmitPRStep } from './submit-pull-request'
import type { CompleteTaskContext } from '../task-to-complete'

const mockGit = {
  uncommittedFiles: vi.fn(),
  push: vi.fn(),
  headSha: vi.fn(),
  baseBranch: vi.fn(),
}

const mockGitHub = {
  getPR: vi.fn(),
  createPR: vi.fn(),
  watchCI: vi.fn(),
}

const submitPR = createSubmitPRStep({
  uncommittedFiles: mockGit.uncommittedFiles,
  push: mockGit.push,
  headSha: mockGit.headSha,
  baseBranch: mockGit.baseBranch,
  getPR: mockGitHub.getPR,
  createPR: mockGitHub.createPR,
  watchCI: mockGitHub.watchCI,
})

function createContext(overrides: Partial<CompleteTaskContext> = {}): CompleteTaskContext {
  return {
    branch: 'feature-branch',
    reviewDir: './test-review',
    hasIssue: false,
    prTitle: 'T',
    prBody: 'B',
    ...overrides,
  }
}

describe('submitPR', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGit.uncommittedFiles.mockResolvedValue([])
    mockGit.push.mockResolvedValue(undefined)
    mockGit.headSha.mockResolvedValue('abc123')
    mockGit.baseBranch.mockResolvedValue('main')
    mockGitHub.watchCI.mockResolvedValue({
      failed: false,
      output: 'passed',
    })
  })

  it('rejects when uncommitted files exist', async () => {
    mockGit.uncommittedFiles.mockResolvedValue(['file.ts'])
    const ctx = createContext({})

    await expect(submitPR.execute(ctx)).rejects.toThrow('Uncommitted changes detected')
  })

  it('proceeds when no uncommitted files', async () => {
    mockGitHub.createPR.mockResolvedValue({
      number: 1,
      url: 'https://pr/1',
    })
    const ctx = createContext({})

    await submitPR.execute(ctx)

    expect(mockGit.push).toHaveBeenCalledWith()
  })

  it('creates PR when no existing PR number', async () => {
    mockGitHub.createPR.mockResolvedValue({
      number: 42,
      url: 'https://pr/42',
    })
    const ctx = createContext({
      prNumber: undefined,
      prTitle: 'PR Title',
      prBody: 'PR Body',
      branch: 'feature-branch',
    })

    await submitPR.execute(ctx)

    expect(mockGitHub.createPR).toHaveBeenCalledWith({
      title: 'PR Title',
      body: 'PR Body',
      branch: 'feature-branch',
      base: 'main',
    })
    expect(ctx.prNumber).toBe(42)
  })

  it('gets existing PR when PR number provided', async () => {
    mockGitHub.getPR.mockResolvedValue({
      number: 100,
      url: 'https://pr/100',
    })
    const ctx = createContext({ prNumber: 100 })

    await submitPR.execute(ctx)

    expect(mockGitHub.getPR).toHaveBeenCalledWith(100)
    expect(mockGitHub.createPR).not.toHaveBeenCalled()
  })

  it('returns failure when CI fails', async () => {
    mockGitHub.createPR.mockResolvedValue({
      number: 1,
      url: 'https://pr/1',
    })
    mockGitHub.watchCI.mockResolvedValue({
      failed: true,
      output: 'tests failed',
    })
    const ctx = createContext({})

    const result = await submitPR.execute(ctx)

    expect(result.type).toBe('failure')
  })

  it('returns success when CI passes', async () => {
    mockGitHub.createPR.mockResolvedValue({
      number: 1,
      url: 'https://pr/1',
    })
    const ctx = createContext({})

    const result = await submitPR.execute(ctx)

    expect(result.type).toBe('success')
  })
})
