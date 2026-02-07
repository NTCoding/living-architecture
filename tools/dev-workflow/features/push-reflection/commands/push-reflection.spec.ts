import {
  describe, it, expect, vi, beforeEach, afterEach 
} from 'vitest'

const mockGit = vi.hoisted(() => ({
  lastCommitFiles: vi.fn(),
  push: vi.fn(),
  baseBranch: vi.fn(),
  branchFilesPriorToHead: vi.fn(),
}))

vi.mock('../../../platform/infra/external-clients/git-client', () => ({ git: mockGit }))

import {
  pushReflection, executePushReflection 
} from './push-reflection'

const REFLECTION_FILE = 'docs/continuous-improvement/post-merge-reflections/reflection-1.md'

describe('pushReflection', () => {
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

      const result = await pushReflection(options)

      expect(result).toStrictEqual({ pushedFiles: files })
      expect(mockGit.push).toHaveBeenCalledOnce()
    })

    it('throws EmptyCommitError when no files in commit', async () => {
      mockGit.lastCommitFiles.mockResolvedValue([])

      await expect(pushReflection(options)).rejects.toThrow('No files in latest commit.')
    })

    it('throws NonReflectionFilesError when commit contains non-reflection files', async () => {
      mockGit.lastCommitFiles.mockResolvedValue([REFLECTION_FILE, 'src/index.ts'])

      await expect(pushReflection(options)).rejects.toThrow('non-reflection files')
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

      const result = await pushReflection(options)

      expect(result).toStrictEqual({ pushedFiles: files })
      expect(mockGit.push).toHaveBeenCalledOnce()
      expect(mockGit.branchFilesPriorToHead).toHaveBeenCalledWith('main')
    })

    it('throws MissingReflectionError when no reflection in prior commits', async () => {
      mockGit.lastCommitFiles.mockResolvedValue(['docs/conventions/anti-patterns.md'])
      mockGit.baseBranch.mockResolvedValue('main')
      mockGit.branchFilesPriorToHead.mockResolvedValue(['src/index.ts', 'README.md'])

      await expect(pushReflection(options)).rejects.toThrow(
        '--follow-ups requires a reflection file in a prior commit',
      )
    })

    it('throws MissingReflectionError when no prior commits on branch', async () => {
      mockGit.lastCommitFiles.mockResolvedValue(['docs/conventions/anti-patterns.md'])
      mockGit.baseBranch.mockResolvedValue('main')
      mockGit.branchFilesPriorToHead.mockResolvedValue([])

      await expect(pushReflection(options)).rejects.toThrow(
        '--follow-ups requires a reflection file in a prior commit',
      )
    })

    it('throws EmptyCommitError when no files in commit', async () => {
      mockGit.lastCommitFiles.mockResolvedValue([])

      await expect(pushReflection(options)).rejects.toThrow('No files in latest commit.')
    })
  })
})

function noop(): void {
  /* intentionally empty */
}

describe('executePushReflection', () => {
  const savedArgv = [...process.argv]

  beforeEach(() => {
    vi.resetAllMocks()
    process.exitCode = undefined
    vi.spyOn(console, 'log').mockImplementation(noop)
  })

  afterEach(() => {
    process.argv = [...savedArgv]
    vi.restoreAllMocks()
  })

  it('outputs success JSON when push succeeds', async () => {
    process.argv = ['node', 'cli.ts']
    const files = [REFLECTION_FILE]
    mockGit.lastCommitFiles.mockResolvedValue(files)
    mockGit.push.mockResolvedValue(undefined)

    await executePushReflection()

    expect(console.log).toHaveBeenCalledWith(
      JSON.stringify({
        success: true,
        pushedFiles: files,
      }),
    )
  })

  it('outputs error JSON and sets exit code on failure', async () => {
    process.argv = ['node', 'cli.ts']
    mockGit.lastCommitFiles.mockResolvedValue([])

    await executePushReflection()

    expect(console.log).toHaveBeenCalledWith(
      JSON.stringify({
        success: false,
        error: 'No files in latest commit.',
      }),
    )
    expect(process.exitCode).toBe(1)
  })

  it('handles non-Error rejection', async () => {
    process.argv = ['node', 'cli.ts']
    mockGit.lastCommitFiles.mockRejectedValue('string error')

    await executePushReflection()

    expect(console.log).toHaveBeenCalledWith(
      JSON.stringify({
        success: false,
        error: 'string error',
      }),
    )
    expect(process.exitCode).toBe(1)
  })

  it('parses --follow-ups flag from process.argv', async () => {
    process.argv = ['node', 'cli.ts', '--follow-ups']
    const files = ['docs/conventions/anti-patterns.md']
    mockGit.lastCommitFiles.mockResolvedValue(files)
    mockGit.baseBranch.mockResolvedValue('main')
    mockGit.branchFilesPriorToHead.mockResolvedValue([REFLECTION_FILE])
    mockGit.push.mockResolvedValue(undefined)

    await executePushReflection()

    expect(mockGit.branchFilesPriorToHead).toHaveBeenCalledWith('main')
    expect(console.log).toHaveBeenCalledWith(
      JSON.stringify({
        success: true,
        pushedFiles: files,
      }),
    )
  })

  it('does not use follow-ups mode when flag is absent', async () => {
    process.argv = ['node', 'cli.ts']
    mockGit.lastCommitFiles.mockResolvedValue([REFLECTION_FILE])
    mockGit.push.mockResolvedValue(undefined)

    await executePushReflection()

    expect(mockGit.branchFilesPriorToHead).not.toHaveBeenCalled()
  })
})
