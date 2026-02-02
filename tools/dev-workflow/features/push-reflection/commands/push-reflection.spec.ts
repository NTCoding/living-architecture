import {
  describe, it, expect, vi, beforeEach 
} from 'vitest'

const mockGit = vi.hoisted(() => ({
  lastCommitFiles: vi.fn(),
  push: vi.fn(),
}))

vi.mock('../../../platform/infra/external-clients/git-client', () => ({ git: mockGit }))

import { executePushReflection } from './push-reflection'

describe('executePushReflection', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('pushes when all files are reflection files', async () => {
    const files = [
      'docs/continuous-improvement/post-merge-reflections/reflection-1.md',
      'docs/continuous-improvement/post-merge-reflections/reflection-2.md',
    ]
    mockGit.lastCommitFiles.mockResolvedValue(files)
    mockGit.push.mockResolvedValue(undefined)

    const result = await executePushReflection()

    expect(result).toStrictEqual({ pushedFiles: files })
    expect(mockGit.push).toHaveBeenCalledOnce()
  })

  it('throws EmptyCommitError when no files in commit', async () => {
    mockGit.lastCommitFiles.mockResolvedValue([])

    await expect(executePushReflection()).rejects.toThrow('No files in latest commit.')
  })

  it('throws NonReflectionFilesError when commit contains non-reflection files', async () => {
    mockGit.lastCommitFiles.mockResolvedValue([
      'docs/continuous-improvement/post-merge-reflections/reflection-1.md',
      'src/index.ts',
    ])

    await expect(executePushReflection()).rejects.toThrow('non-reflection files')
  })
})
