import {
  describe, it, expect, vi, beforeEach 
} from 'vitest'

const { mockRepo } = vi.hoisted(() => ({
  mockRepo: {
    diff: vi.fn(),
    status: vi.fn(),
    add: vi.fn(),
    commit: vi.fn(),
    push: vi.fn(),
    getRemotes: vi.fn(),
    branch: vi.fn(),
    revparse: vi.fn(),
  },
}))

vi.mock('simple-git', () => ({ default: () => mockRepo }))

import {
  git, GitError 
} from './git-client'

describe('GitError', () => {
  it('creates error with name GitError', () => {
    const error = new GitError('test message')

    expect(error.name).toBe('GitError')
    expect(error.message).toBe('test message')
  })
})

describe('git.diffFiles', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns list of changed files', async () => {
    mockRepo.diff.mockResolvedValue('file1.ts\nfile2.ts\n')

    const files = await git.diffFiles('main')

    expect(files).toStrictEqual(['file1.ts', 'file2.ts'])
    expect(mockRepo.diff).toHaveBeenCalledWith(['--name-only', 'main'])
  })

  it('filters out empty lines', async () => {
    mockRepo.diff.mockResolvedValue('file.ts\n\n')

    const files = await git.diffFiles('main')

    expect(files).toStrictEqual(['file.ts'])
  })
})

describe('git.uncommittedFiles', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns all uncommitted files from various status categories', async () => {
    mockRepo.status.mockResolvedValue({
      modified: ['mod.ts'],
      not_added: ['new.ts'],
      created: ['created.ts'],
      deleted: ['deleted.ts'],
      conflicted: ['conflict.ts'],
      staged: ['staged.ts'],
      renamed: [{ to: 'renamed.ts' }],
    })

    const files = await git.uncommittedFiles()

    expect(files).toStrictEqual([
      'mod.ts',
      'new.ts',
      'created.ts',
      'deleted.ts',
      'conflict.ts',
      'staged.ts',
      'renamed.ts',
    ])
  })
})

describe('git.stagedFiles', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns staged files', async () => {
    mockRepo.status.mockResolvedValue({ staged: ['staged1.ts', 'staged2.ts'] })

    const files = await git.stagedFiles()

    expect(files).toStrictEqual(['staged1.ts', 'staged2.ts'])
  })
})

describe('git.stageAll', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls repo.add with .', async () => {
    await git.stageAll()

    expect(mockRepo.add).toHaveBeenCalledWith('.')
  })
})

describe('git.commit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('commits with message', async () => {
    await git.commit('feat: add feature')

    expect(mockRepo.commit).toHaveBeenCalledWith('feat: add feature')
  })
})

describe('git.push', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('pushes to origin with upstream tracking', async () => {
    await git.push()

    expect(mockRepo.push).toHaveBeenCalledWith(['-u', 'origin', 'HEAD'])
  })
})

describe('git.currentBranch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns current branch name', async () => {
    mockRepo.status.mockResolvedValue({ current: 'feature-branch' })

    const branch = await git.currentBranch()

    expect(branch).toBe('feature-branch')
  })

  it('throws GitError when no current branch', async () => {
    mockRepo.status.mockResolvedValue({ current: null })

    await expect(git.currentBranch()).rejects.toThrow(GitError)
    await expect(git.currentBranch()).rejects.toThrow('Could not determine current branch')
  })
})

describe('git.baseBranch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns main when origin/main exists', async () => {
    mockRepo.getRemotes.mockResolvedValue([{ name: 'origin' }])
    mockRepo.branch.mockResolvedValue({ all: ['origin/main', 'origin/feature'] })

    const base = await git.baseBranch()

    expect(base).toBe('main')
  })

  it('returns master when only origin/master exists', async () => {
    mockRepo.getRemotes.mockResolvedValue([{ name: 'origin' }])
    mockRepo.branch.mockResolvedValue({ all: ['origin/master', 'origin/feature'] })

    const base = await git.baseBranch()

    expect(base).toBe('master')
  })

  it('throws GitError when no origin remote', async () => {
    mockRepo.getRemotes.mockResolvedValue([{ name: 'upstream' }])

    await expect(git.baseBranch()).rejects.toThrow(GitError)
    await expect(git.baseBranch()).rejects.toThrow('No origin remote found')
  })

  it('throws GitError when no main or master branch', async () => {
    mockRepo.getRemotes.mockResolvedValue([{ name: 'origin' }])
    mockRepo.branch.mockResolvedValue({ all: ['origin/develop'] })

    await expect(git.baseBranch()).rejects.toThrow(GitError)
    await expect(git.baseBranch()).rejects.toThrow('No base branch found')
  })
})

describe('git.headSha', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns trimmed SHA', async () => {
    mockRepo.revparse.mockResolvedValue('abc123\n')

    const sha = await git.headSha()

    expect(sha).toBe('abc123')
    expect(mockRepo.revparse).toHaveBeenCalledWith(['HEAD'])
  })
})
