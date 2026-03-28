import {
  describe, it, expect 
} from 'vitest'
import { getRepositoryInfo } from './git-repository-info'
import { GitError } from './git-errors'

class GitProcessError extends Error {
  constructor(
    message: string,
    readonly stderr?: string,
  ) {
    super(message)
    this.name = 'GitProcessError'
    if (stderr !== undefined) {
      Object.defineProperty(this, 'stderr', { value: stderr })
    }
  }
}

// Tests for SSH URL parsing
describe('getRepositoryInfo parses SSH URLs', () => {
  it('parses SSH URL with .git extension', () => {
    const executor = () => 'git@github.com:owner/repo.git'
    const result = getRepositoryInfo('git', '/test/dir', executor)

    expect(result).toStrictEqual({
      name: 'owner/repo',
      owner: 'owner',
      url: 'git@github.com:owner/repo.git',
    })
  })

  it('parses SSH URL without .git extension', () => {
    const executor = () => 'git@github.com:owner/repo'
    const result = getRepositoryInfo('git', '/test/dir', executor)

    expect(result).toStrictEqual({
      name: 'owner/repo',
      owner: 'owner',
      url: 'git@github.com:owner/repo',
    })
  })
})

// Tests for HTTPS URL parsing
describe('getRepositoryInfo parses HTTPS URLs', () => {
  it('parses HTTPS URL with .git extension', () => {
    const executor = () => 'https://github.com/owner/repo.git'
    const result = getRepositoryInfo('git', '/test/dir', executor)

    expect(result).toStrictEqual({
      name: 'owner/repo',
      owner: 'owner',
      url: 'https://github.com/owner/repo.git',
    })
  })

  it('parses HTTPS URL without .git extension', () => {
    const executor = () => 'https://github.com/owner/repo'
    const result = getRepositoryInfo('git', '/test/dir', executor)

    expect(result).toStrictEqual({
      name: 'owner/repo',
      owner: 'owner',
      url: 'https://github.com/owner/repo',
    })
  })
})

// Tests for fallback behavior
describe('getRepositoryInfo falls back for unparseable URLs', () => {
  it('returns URL as name when format is unrecognized', () => {
    const executor = () => 'file:///local/path'
    const result = getRepositoryInfo('git', '/test/dir', executor)

    expect(result).toStrictEqual({
      name: 'file:///local/path',
      url: 'file:///local/path',
    })
  })
})

// Tests for error handling
describe('getRepositoryInfo throws GitError when git is not installed', () => {
  it('throws GIT_NOT_FOUND when executor throws ENOENT', () => {
    const enoentError = new GitProcessError('spawn git ENOENT')
    Object.assign(enoentError, { code: 'ENOENT' })
    const executor = () => {
      throw enoentError
    }

    expect(() => getRepositoryInfo('git', '/test/dir', executor)).toThrow(
      expect.objectContaining({ gitErrorCode: 'GIT_NOT_FOUND' }),
    )
  })
})

describe('getRepositoryInfo throws GitError when not in a git repository', () => {
  it('throws NOT_A_REPOSITORY when stderr contains "not a git repository"', () => {
    const executor = () => {
      throw new GitProcessError('git failed', 'fatal: not a git repository (or any parent): .git')
    }

    expect(() => getRepositoryInfo('git', '/test/dir', executor)).toThrow(
      expect.objectContaining({ gitErrorCode: 'NOT_A_REPOSITORY' }),
    )
  })
})

describe('getRepositoryInfo throws GitError when origin remote is missing', () => {
  it('throws NO_REMOTE when stderr contains "No such remote"', () => {
    const executor = () => {
      throw new GitProcessError('git failed', "No such remote 'origin'")
    }

    expect(() => getRepositoryInfo('git', '/test/dir', executor)).toThrow(
      expect.objectContaining({ gitErrorCode: 'NO_REMOTE' }),
    )
  })
})

describe('getRepositoryInfo rethrows GitError from inner operations', () => {
  it('rethrows GitError unchanged', () => {
    const innerGitError = new GitError('BASE_BRANCH_NOT_FOUND', 'Branch not found.')
    const executor = () => {
      throw innerGitError
    }

    expect(() => getRepositoryInfo('git', '/test/dir', executor)).toThrow(innerGitError)
  })
})

describe('getRepositoryInfo rethrows unrecognized errors', () => {
  it('rethrows error with unrecognized stderr unchanged', () => {
    const unknownError = new GitProcessError('unexpected failure', 'some unrecognized git output')
    const executor = () => {
      throw unknownError
    }

    expect(() => getRepositoryInfo('git', '/test/dir', executor)).toThrow(unknownError)
  })

  it('rethrows error without stderr property unchanged', () => {
    const noStderrError = new GitProcessError('unexpected failure')
    const executor = () => {
      throw noStderrError
    }

    expect(() => getRepositoryInfo('git', '/test/dir', executor)).toThrow(noStderrError)
  })

  it('rethrows error with empty stderr unchanged', () => {
    const emptyStderrError = new GitProcessError('unexpected failure', '')
    const executor = () => {
      throw emptyStderrError
    }

    expect(() => getRepositoryInfo('git', '/test/dir', executor)).toThrow(emptyStderrError)
  })

  it('rethrows non-Error throws unchanged', () => {
    const executor = () => {
      throw 'unexpected string error'
    }

    expect(() => getRepositoryInfo('git', '/test/dir', executor)).toThrow('unexpected string error')
  })
})
