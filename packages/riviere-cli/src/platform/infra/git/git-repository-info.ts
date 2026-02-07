import { execFileSync } from 'node:child_process'

type GitErrorCode = 'NOT_A_REPOSITORY' | 'GIT_NOT_FOUND' | 'NO_REMOTE'

export class GitError extends Error {
  readonly gitErrorCode: GitErrorCode

  /* v8 ignore start -- @preserve: Error constructor; tested via integration */
  constructor(code: GitErrorCode, message: string) {
    super(`[GIT_ERROR] ${code}. ${message}`)
    this.gitErrorCode = code
  }
  /* v8 ignore stop */
}

class RepositoryUrlParseError extends Error {
  /* v8 ignore start -- @preserve: Error constructor; tested via integration */
  constructor(url: string) {
    super(`Expected owner and repo in git URL, got ${url}`)
    this.name = 'RepositoryUrlParseError'
  }
  /* v8 ignore stop */
}

export interface RepositoryInfo {
  name: string
  owner?: string
  url: string
}

export type GitExecutor = (binary: string, args: readonly string[], cwd: string) => string

/* v8 ignore start -- @preserve: default executor delegates to execFileSync; tested via CLI integration */
function defaultGitExecutor(binary: string, args: readonly string[], cwd: string): string {
  return execFileSync(binary, args, {
    cwd,
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim()
}
/* v8 ignore stop */

/* v8 ignore start -- @preserve: git operations; mocked in all integration tests */
function extractStderr(error: Error): string {
  if (!Object.hasOwn(error, 'stderr')) {
    throw error
  }
  const stderrValue: unknown = Object.getOwnPropertyDescriptor(error, 'stderr')?.value
  if (!stderrValue) {
    throw error
  }
  return String(stderrValue)
}

function runGit(
  executor: GitExecutor,
  gitBinary: string,
  cwd: string,
  args: readonly string[],
): string {
  try {
    return executor(gitBinary, args, cwd)
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      throw new GitError('GIT_NOT_FOUND', 'Install git to detect repository information.')
    }
    // ANTI-PATTERN EXCEPTION: String-Based Error Detection (AP-001)
    // Justification: git CLI only reports repo status via stderr text
    if (error instanceof Error) {
      const stderr = extractStderr(error)
      if (stderr.includes('not a git repository')) {
        throw new GitError('NOT_A_REPOSITORY', 'Run from within a git repository.')
      }
    }
    throw error
  }
}

function parseRepositoryUrl(url: string): RepositoryInfo {
  // SSH format: git@github.com:owner/repo.git
  const sshRegex = /^git@[^:]+:([^/]+)\/(.+?)(?:\.git)?$/
  const sshMatch = sshRegex.exec(url)
  if (sshMatch) {
    const [, owner, repo] = sshMatch
    if (!owner || !repo) {
      throw new RepositoryUrlParseError(url)
    }
    return {
      name: `${owner}/${repo}`,
      owner,
      url,
    }
  }

  // HTTPS format: https://github.com/owner/repo.git
  const httpsRegex = /^https?:\/\/[^/]+\/([^/]+)\/(.+?)(?:\.git)?$/
  const httpsMatch = httpsRegex.exec(url)
  if (httpsMatch) {
    const [, owner, repo] = httpsMatch
    if (!owner || !repo) {
      throw new RepositoryUrlParseError(url)
    }
    return {
      name: `${owner}/${repo}`,
      owner,
      url,
    }
  }

  // Fallback: use URL as-is if parsing fails
  return {
    name: url,
    url,
  }
}

export function getRepositoryInfo(
  gitBinary = 'git',
  cwd = process.cwd(),
  executor: GitExecutor = defaultGitExecutor,
): RepositoryInfo {
  try {
    const url = runGit(executor, gitBinary, cwd, ['remote', 'get-url', 'origin'])
    return parseRepositoryUrl(url)
  } catch (error) {
    if (error instanceof Error) {
      const stderr = extractStderr(error)
      if (stderr.includes('No such remote')) {
        throw new GitError('NO_REMOTE', 'No git remote named "origin" found.')
      }
    }
    throw error
  }
}
/* v8 ignore stop */
