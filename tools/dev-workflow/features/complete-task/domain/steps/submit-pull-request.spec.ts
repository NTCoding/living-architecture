import {
  describe, it, expect, vi, beforeEach 
} from 'vitest'

const {
  mockGit, mockGitHub 
} = vi.hoisted(() => ({
  mockGit: {
    uncommittedFiles: vi.fn(),
    stageAll: vi.fn(),
    commit: vi.fn(),
    push: vi.fn(),
    headSha: vi.fn(),
    baseBranch: vi.fn(),
  },
  mockGitHub: {
    getPR: vi.fn(),
    createPR: vi.fn(),
    watchCI: vi.fn(),
  },
}))

vi.mock('../../../../platform/infra/external-clients/git-client', () => ({ git: mockGit }))
vi.mock('../../../../platform/infra/external-clients/github-rest-client', () => ({github: mockGitHub,}))

import { submitPR } from './submit-pull-request'
import type { CompleteTaskContext } from '../task-to-complete'

function createContext(overrides: Partial<CompleteTaskContext> = {}): CompleteTaskContext {
  return {
    branch: 'feature-branch',
    reviewDir: './test-review',
    hasIssue: false,
    commitMessage: 'msg',
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

  it('commits changes when uncommitted files exist', async () => {
    mockGit.uncommittedFiles.mockResolvedValue(['file.ts'])
    mockGitHub.createPR.mockResolvedValue({
      number: 1,
      url: 'https://pr/1',
    })
    const ctx = createContext({ commitMessage: 'feat: add feature' })

    await submitPR.execute(ctx)

    expect(mockGit.stageAll).toHaveBeenCalledWith()
    expect(mockGit.commit).toHaveBeenCalledWith('feat: add feature')
  })

  it('skips commit when no uncommitted files', async () => {
    mockGitHub.createPR.mockResolvedValue({
      number: 1,
      url: 'https://pr/1',
    })
    const ctx = createContext({})

    await submitPR.execute(ctx)

    expect(mockGit.stageAll).not.toHaveBeenCalled()
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
