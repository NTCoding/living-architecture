import {
  describe, it, expect, vi, beforeEach 
} from 'vitest'

const mockGit = vi.hoisted(() => ({
  lastCommitFiles: vi.fn(),
  push: vi.fn(),
  baseBranch: vi.fn(),
  branchFilesPriorToHead: vi.fn(),
}))

vi.mock('../../../platform/infra/external-clients/git/client', () => ({ git: mockGit }))

import { executePushReflection } from './push-reflection'

const REFLECTION_FILE = 'docs/continuous-improvement/post-merge-reflections/reflection-1.md'

describe('executePushReflection', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('without --follow-ups', () => {
    const options = { followUps: false }

    it('pushes when all files are reflection files', async () => {
      const files = [
        REFLECTION_FILE,
        'docs/continuous-improvement/post-merge-reflections/reflection-2.md',
      ]
      mockGit.lastCommitFiles.mockResolvedValue(files)
      mockGit.push.mockResolvedValue(undefined)

      const result = await executePushReflection(options)

      expect(result).toStrictEqual({ pushedFiles: files })
      expect(mockGit.push).toHaveBeenCalledOnce()
    })

    it('throws EmptyCommitError when no files in commit', async () => {
      mockGit.lastCommitFiles.mockResolvedValue([])

      await expect(executePushReflection(options)).rejects.toThrow('No files in latest commit.')
    })

    it('throws NonReflectionFilesError when commit contains non-reflection files', async () => {
      mockGit.lastCommitFiles.mockResolvedValue([REFLECTION_FILE, 'src/index.ts'])

      await expect(executePushReflection(options)).rejects.toThrow('non-reflection files')
    })
  })

  describe('with --follow-ups', () => {
    const options = { followUps: true }

    it('pushes when reflection exists in prior commits', async () => {
      const files = [
        'docs/conventions/anti-patterns.md',
        'docs/conventions/review-feedback-checks.md',
      ]
      mockGit.lastCommitFiles.mockResolvedValue(files)
      mockGit.baseBranch.mockResolvedValue('main')
      mockGit.branchFilesPriorToHead.mockResolvedValue([REFLECTION_FILE])
      mockGit.push.mockResolvedValue(undefined)

      const result = await executePushReflection(options)

      expect(result).toStrictEqual({ pushedFiles: files })
      expect(mockGit.push).toHaveBeenCalledOnce()
      expect(mockGit.branchFilesPriorToHead).toHaveBeenCalledWith('main')
    })

    it('throws MissingReflectionError when no reflection in prior commits', async () => {
      mockGit.lastCommitFiles.mockResolvedValue(['docs/conventions/anti-patterns.md'])
      mockGit.baseBranch.mockResolvedValue('main')
      mockGit.branchFilesPriorToHead.mockResolvedValue(['src/index.ts', 'README.md'])

      await expect(executePushReflection(options)).rejects.toThrow(
        '--follow-ups requires a reflection file in a prior commit',
      )
    })

    it('throws MissingReflectionError when no prior commits on branch', async () => {
      mockGit.lastCommitFiles.mockResolvedValue(['docs/conventions/anti-patterns.md'])
      mockGit.baseBranch.mockResolvedValue('main')
      mockGit.branchFilesPriorToHead.mockResolvedValue([])

      await expect(executePushReflection(options)).rejects.toThrow(
        '--follow-ups requires a reflection file in a prior commit',
      )
    })

    it('throws EmptyCommitError when no files in commit', async () => {
      mockGit.lastCommitFiles.mockResolvedValue([])

      await expect(executePushReflection(options)).rejects.toThrow('No files in latest commit.')
    })
  })
})
