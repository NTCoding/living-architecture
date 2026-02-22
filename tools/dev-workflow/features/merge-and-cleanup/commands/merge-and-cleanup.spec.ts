import {
  describe, it, expect, vi, beforeEach 
} from 'vitest'

const mockGit = vi.hoisted(() => ({
  currentBranch: vi.fn(),
  uncommittedFiles: vi.fn(),
}))

const mockGithub = vi.hoisted(() => ({
  findPRForBranch: vi.fn(),
  mergePR: vi.fn(),
}))

const mockResolveWorktreeInfo = vi.hoisted(() => vi.fn())

const contextResults: Promise<unknown>[] = []

const mockRunWorkflow = vi.hoisted(() =>
  vi.fn().mockImplementation((_steps: unknown, builder: () => Promise<unknown>) => {
    contextResults.push(builder())
  }),
)

vi.mock('../../../platform/infra/external-clients/git-client', () => ({ git: mockGit }))
vi.mock('../../../platform/infra/external-clients/github-rest-client', () => ({github: mockGithub,}))
vi.mock('../../../platform/infra/workflow-execution/run-workflow', () => ({runWorkflow: mockRunWorkflow,}))
vi.mock('../domain/worktree-operations', () => ({
  resolveWorktreeInfo: mockResolveWorktreeInfo,
  removeWorktreePermission: vi.fn(),
  removeWorktree: vi.fn(),
}))

import { executeMergeAndCleanup } from './merge-and-cleanup'

describe('executeMergeAndCleanup', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    contextResults.length = 0
    mockRunWorkflow.mockImplementation((_steps: unknown, builder: () => Promise<unknown>) => {
      contextResults.push(builder())
    })
    mockGit.currentBranch.mockResolvedValue('issue-42')
    mockGithub.findPRForBranch.mockResolvedValue(99)
    mockResolveWorktreeInfo.mockReturnValue({
      worktreePath: '/home/user/worktrees/issue-42',
      mainRepoPath: '/home/user/repo',
    })
  })

  it('calls runWorkflow with steps and a context builder', () => {
    executeMergeAndCleanup()

    expect(mockRunWorkflow).toHaveBeenCalledOnce()
    expect(mockRunWorkflow).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ name: expect.any(String) })]),
      expect.any(Function),
    )
  })

  it('context builder resolves worktree info and PR number', async () => {
    mockGit.currentBranch.mockResolvedValue('issue-42')
    mockGithub.findPRForBranch.mockResolvedValue(99)

    executeMergeAndCleanup()

    const ctx = await contextResults[0]
    expect(ctx).toMatchObject({
      branch: 'issue-42',
      prNumber: 99,
      worktreePath: '/home/user/worktrees/issue-42',
      mainRepoPath: '/home/user/repo',
    })
  })

  it('context builder throws when no PR exists', async () => {
    mockGit.currentBranch.mockResolvedValue('issue-42')
    mockGithub.findPRForBranch.mockResolvedValue(undefined)

    executeMergeAndCleanup()

    await expect(contextResults[0]).rejects.toThrow("No open PR found for branch 'issue-42'")
  })
})
