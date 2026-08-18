import { describe, it, expect, vi, beforeEach } from 'vitest'
import { execFileSync } from 'node:child_process'
import { runGit } from './run-git'
import { GitError } from './git-errors'

vi.mock('node:child_process', () => ({
  execFileSync: vi.fn(),
}))

const mockExec = vi.mocked(execFileSync)

class MockExecError extends Error {
  readonly code?: string
  readonly stderr?: string

  constructor(message: string, properties: { code?: string; stderr?: string } = {}) {
    super(message)
    this.name = 'MockExecError'
    if (properties.code !== undefined) {
      this.code = properties.code
    }
    if (properties.stderr !== undefined) {
      this.stderr = properties.stderr
    }
  }
}

beforeEach(() => {
  vi.resetAllMocks()
  mockExec.mockReturnValue('output')
})

describe('runGit', () => {
  it('returns stdout on success', () => {
    expect(runGit(['status'])).toBe('output')
    expect(mockExec).toHaveBeenCalledWith(
      'git',
      ['status'],
      expect.objectContaining({ encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }),
    )
  })

  it('strips GIT_ environment variables from child process env', () => {
    process.env['GIT_EXECUTABLE'] = '/usr/local/bin/git'
    try {
      runGit(['status'])
      expect(mockExec).toHaveBeenCalledWith(
        '/usr/local/bin/git',
        ['status'],
        expect.objectContaining({
          env: expect.not.objectContaining({ GIT_EXECUTABLE: expect.anything() }),
        }),
      )
    } finally {
      delete process.env['GIT_EXECUTABLE']
    }
  })

  it('throws GIT_NOT_FOUND on ENOENT', () => {
    mockExec.mockImplementation(() => {
      throw new MockExecError('spawn git ENOENT', { code: 'ENOENT' })
    })
    expect(() => runGit(['status'])).toThrow(GitError)
    expect(() => runGit(['status'])).toThrow(
      expect.objectContaining({ gitErrorCode: 'GIT_NOT_FOUND' }),
    )
  })

  it('throws NOT_A_REPOSITORY on stderr "not a git repository"', () => {
    mockExec.mockImplementation(() => {
      throw new MockExecError('git failed', { stderr: 'fatal: not a git repository' })
    })
    expect(() => runGit(['status'])).toThrow(GitError)
    expect(() => runGit(['status'])).toThrow(
      expect.objectContaining({ gitErrorCode: 'NOT_A_REPOSITORY' }),
    )
  })

  it('throws NOT_A_REPOSITORY for rev-parse commands', () => {
    mockExec.mockImplementation(() => {
      throw new MockExecError('git failed', { stderr: 'fatal: bad revision' })
    })
    expect(() => runGit(['rev-parse', '--is-inside-work-tree'])).toThrow(GitError)
    expect(() => runGit(['rev-parse', '--is-inside-work-tree'])).toThrow(
      expect.objectContaining({ gitErrorCode: 'NOT_A_REPOSITORY' }),
    )
  })

  it('rethrows error with no stderr', () => {
    mockExec.mockImplementation(() => {
      throw new MockExecError('unexpected failure')
    })
    expect(() => runGit(['status'])).toThrow('unexpected failure')
  })

  it('rethrows non-Error throws', () => {
    mockExec.mockImplementation(() => {
      throw 'string error'
    })
    expect(() => runGit(['status'])).toThrow('string error')
  })
})
